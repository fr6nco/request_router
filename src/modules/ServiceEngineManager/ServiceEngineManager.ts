import * as http from "http"
import * as net from "net"
import * as config from "config"
import * as EventEmitter from "events"
import { Observable, Subscription, Observer } from 'rxjs'
import { ControllerConnector } from "../ControllerConnector/ControllerConnector";

enum connState {
    ESTABLISHING = 'ESTABLISHING',
    CONNECTED = 'CONNECTED',
    ERROR = 'ERROR',
    CLOSED = 'CLOSED'
}

//Connection class
class Connection extends EventEmitter {
    socket: net.Socket;
    source_ip: string;
    source_port: number;
    dest_ip: string;
    dest_port: number
    state: connState;

    public constructor(dest_ip: string, dest_port: number, source_ip: string) {
        super();
        this.source_ip = source_ip;
        this.dest_ip = dest_ip;
        this.dest_port = dest_port;
        this.state = connState.ESTABLISHING;
        this.connect();
    }

    //Wraps setting state and emits state
    private setAndEmitState(state: connState) {
        this.state = state;
        this.emit(state);
    }

    //Starts connection
    public connect() {
        let connectionOptions: net.TcpSocketConnectOpts = {
            host: this.dest_ip,
            port: this.dest_port,
            family: 4,
            localAddress: config.get('http.host')
        };

        this.socket = net.createConnection(connectionOptions, () => {
            this.source_port = this.socket.localPort;
            console.log(`Connected to Service Engine on ${this.source_ip}:${this.source_port} <->${this.dest_ip}:${this.dest_port}`);
            this.setAndEmitState(connState.CONNECTED);
        });

        this.socket.on('error', (err) => {
            console.error('Failed to establish connection');
        })

        this.socket.on('close', (hadError) => {
            this.setAndEmitState(hadError ? connState.ERROR : connState.CLOSED);
        });
    }

    public close(): void {
        this.socket.destroy();
    }
}

//Liveness object
interface Liveness {
    limit: number;
    live: number;
    errors: number;
    establishing: number;
    state: string;
}

enum ServiceEngineState {
    LIVE = "LIVE",
    FAULTY = "FAULTY", //Starts a timer for 30 sec, if wont go back to live goes DEAD, SE is removed
    DEAD = "DEAD",
    IDLE = "IDLE"
}

interface ServiceEngineInterface {
    ip: string;
    port: number;
    name: string;
}

const CONNECTIONEVENT = "CONNECTIONEVENT";
const FAULTTIMER = 10000;

//Service Engine handler
class ServiceEngine extends EventEmitter implements Liveness {
    private agent: http.Agent;
    private connections: Connection[];
    private connectionEventEmitter: EventEmitter;

    //Interface types
    limit: number;
    live: number;
    errors: number;
    establishing: number;
    state: string;

    private ip: string;
    private port: number;
    private name: string;

    private faultyTimer: any;

    private getLiveness(): Liveness {
        return {
            limit: this.limit,
            live: this.connections.filter(e => e.state == connState.CONNECTED).length,
            errors: this.errors,
            establishing: this.connections.filter(e => e.state == connState.ESTABLISHING).length,
            state: this.state
        };
    }

    private addConnection(connection: Connection) {
        this.connections.push(connection);
    }

    private delConnection(connection: Connection) {
        this.connections = this.connections.filter((e) => (e !== connection));
    }

    private setupConnection(): Observable<Connection> {
        return Observable.create((observer: Observer<Connection>) => {
            let conn = new Connection(this.ip, this.port, config.get('http.host'));
            this.addConnection(conn);

            conn.on(connState.ERROR, () => {
                observer.next(conn);
            });
            conn.on(connState.CONNECTED, () => {
                observer.next(conn);
            });
            conn.on(connState.CLOSED, () => {
                observer.next(conn);
            });

            observer.next(conn);
        });
    }

    public getServiceEngineParams(): ServiceEngineInterface {
        return {
            name: this.name,
            ip: this.ip,
            port: this.port
        }
    }

    public HandleConnections(): void {
        let liveness = this.getLiveness();
        console.log(liveness);
        if (liveness.live + liveness.establishing < liveness.limit) {
            let connObserver = this.setupConnection().subscribe((connection: Connection) => {
                switch (connection.state) {
                    case connState.ERROR: {
                        this.errors++;
                        this.delConnection(connection);
                        connObserver.unsubscribe();
                        break;
                    }
                    case connState.CLOSED: {
                        this.delConnection(connection);
                        connObserver.unsubscribe();
                        break;
                    }
                }
                this.HandleConnections();
                this.connectionEventEmitter.emit(CONNECTIONEVENT, connection);
            });
        }
    }

    private handleFaultyTimerTimeout(): void {
        console.log('Faulty Timer exceeded');
        this.limit = 0;
        this.setStateAndEmit(ServiceEngineState.DEAD);

        this.connections.forEach((conn) => {
            conn.close();
        });
    }

    private setStateAndEmit(state: ServiceEngineState) {
        if (this.state != state) {
            this.state = state;
            this.emit(state);
        }
    }

    private handleConnectionEvents(): void {
        this.connectionEventEmitter.on(CONNECTIONEVENT, (connection) => {
            switch (connection.state) {
                case connState.CONNECTED: {
                    this.setStateAndEmit(ServiceEngineState.LIVE);
                    this.emit(ServiceEngineState.LIVE);
                    if (this.faultyTimer) {
                        clearTimeout(this.faultyTimer);
                    }
                    break;
                }
                case connState.ERROR: {
                    if (this.state == ServiceEngineState.LIVE || this.state == ServiceEngineState.IDLE) {
                        this.setStateAndEmit(ServiceEngineState.FAULTY);
                        console.log("Starting Faulty Timer");
                        this.faultyTimer = setTimeout(() => {
                            this.handleFaultyTimerTimeout();
                        }, FAULTTIMER);
                    }
                }
            }
        });
    }


    public runServiceEngine(): void {
        this.handleConnectionEvents();
        setTimeout(() => {
            this.HandleConnections();
        }, 1000);
    }

    constructor(name: string, ip: string, port: number) {
        super();
        this.name = name;
        this.ip = ip;
        this.port = port;
        this.agent = new http.Agent();
        this.limit = 3;
        this.live = 0;
        this.errors = 0;
        this.establishing = 0;
        this.connections = [];
        this.state = ServiceEngineState.IDLE;
        this.connectionEventEmitter = new EventEmitter();
        this.faultyTimer = null;
    }
}

class ServiceEngineManager {
    private serviceEngines: Array<ServiceEngine> = [];
    private controller: ControllerConnector;

    constructor(controller: ControllerConnector) {
        console.log('Instantiating Service EngineManager');
        this.controller = controller;
    }

    private listenEvents(se: ServiceEngine) {
        se.on(ServiceEngineState.FAULTY, () => {
            //DISABLE temporrarily from RYU
            this.controller.disableSe(se.getServiceEngineParams());
        });
        se.on(ServiceEngineState.LIVE, () => {
            //REGISTER to RYU / or Re-REGISTER
            console.log('Live event received');
            this.controller.enableSe(se.getServiceEngineParams());
        });
        se.on(ServiceEngineState.DEAD, () => {
            //UNREGISTER from RYU
            this.controller.delSe(se.getServiceEngineParams());
        });
    }

    private registerSe(se: ServiceEngine) {
        this.controller.registerSe(se.getServiceEngineParams());
    }

    public getServiceEngines(): Array<ServiceEngine> {
        return this.serviceEngines;
    }

    public addServiceEngine(se: ServiceEngine) {
        this.listenEvents(se);
        this.registerSe(se);
        se.runServiceEngine();
        this.serviceEngines.push(se);
    }
}

export { ServiceEngineManager };
export { ServiceEngine };
export { ServiceEngineInterface };