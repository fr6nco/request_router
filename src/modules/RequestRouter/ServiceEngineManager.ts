import * as http from "http"
import * as config from "config"
import * as EventEmitter from "events"
import { ControllerConnector } from "../ControllerConnector/ControllerConnector";
import { SEConnection, connState } from "./SEConnection";
import { Observable, Observer } from 'rxjs';

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
    private connections: SEConnection[];
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

    private addConnection(connection: SEConnection) {
        this.connections.push(connection);
    }

    private delConnection(connection: SEConnection) {
        this.connections = this.connections.filter((e) => (e !== connection));
    }

    private setupConnection(): Observable<SEConnection> {
        return Observable.create((observer: Observer<SEConnection>) => {
            let conn = new SEConnection(this.ip, this.port, config.get('http.host'));
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
            let connObserver = this.setupConnection().subscribe((connection: SEConnection) => {
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

export { ServiceEngine };
export { ServiceEngineState };
export { ServiceEngineInterface };