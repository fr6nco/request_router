import * as http from "http"
import * as net from "net"
import * as config from "config"
import * as EventEmitter from "events"
import { Observable, Subscription, Observer } from 'rxjs'

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

        let sock = net.createConnection(connectionOptions, () => {
            console.log(`Connected to Service Engine on ${this.source_ip}:${this.source_port} <->${this.dest_ip}:${this.dest_port}`);
            this.setAndEmitState(connState.CONNECTED);
        });
        
        this.source_port = sock.localPort;
        
        sock.on('error', (err) => {
            console.error('Failed to establish connection');
        })

        sock.on('close', (hadError) => {
            this.setAndEmitState(hadError ? connState.ERROR: connState.CLOSED);
        });
    }
}

//Liveness object
interface Liveness {
    limit: number;
    live: number;
    errors: number;
    establishing: number;
}

//Service Engine handler
class ServiceEngine implements Liveness {
    private agent: http.Agent;
    private connections: Connection[];
    
    //Interface types
    limit: number;
    live: number;
    errors: number;
    establishing: number;

    private ip: string;
    private port: number;

    private getLiveness(): Liveness {
        return {
            limit: this.limit, 
            live: this.connections.filter(e => e.state == connState.CONNECTED).length, 
            errors: this.errors, 
            establishing: this.connections.filter(e => e.state == connState.ESTABLISHING).length
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

    public HandleConnections(): void {
        let liveness = this.getLiveness();
        console.log(liveness);
        if(liveness.live + liveness.establishing < liveness.limit) {
            let connObserver = this.setupConnection().subscribe((connection: Connection) => {
                switch(connection.state) {
                    case connState.ERROR: {
                        this.errors++;
                        this.delConnection(connection);
                        connObserver.unsubscribe();
                        this.HandleConnections();
                        break;
                    }
                    case connState.CLOSED: {
                        this.delConnection(connection);
                        connObserver.unsubscribe();
                        this.HandleConnections();
                        break;
                    }
                    default: {
                        this.HandleConnections();
                    }
                }
            });
        }

        console.log(this.connections.length);
    }

    constructor(ip: string, port: number) {
        this.ip = ip;
        this.port = port;
        this.agent = new http.Agent();
        this.limit = 3;
        this.live = 0;
        this.errors = 0;
        this.establishing = 0;
        this.connections = [];
    }
}

class ServiceEngineManager {
    private serviceEngines: Array<ServiceEngine> = [];

    constructor() {
        console.log('Instantiating Service EngineManager');
    }

    public getServiceEngines(): Array<ServiceEngine> {
        return this.serviceEngines;
    }

    public addServiceEngine(se: ServiceEngine) {
        se.HandleConnections();
        this.serviceEngines.push(se);
    }
}

export { ServiceEngineManager };
export { ServiceEngine };