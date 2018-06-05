import * as http from "http"
import * as config from "config"
import * as EventEmitter from "events"
import { ControllerConnector } from "../ControllerConnector/ControllerConnector";
import { SEConnection, connState } from "./SEConnection";

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
    IDLE = "IDLE",
    SHUTDOWN = "SHUTDOWN"
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

    private handleFaultyTimerTimeout(): void {
        console.log('Faulty Timer exceeded');
        this.limit = 0;

        this.setState(ServiceEngineState.DEAD);

        this.connections.forEach((conn) => {
            conn.close();
        });
    }

    private handleConnecitonCounts(conn: SEConnection): void {
        conn.on(connState.CONNECTED, () => {
            this.addConnection(conn);
            this.live++;
            this.setupConnections();
        });

        conn.on(connState.FAILED, () => {
            this.delConnection(conn);
            this.live--;
            this.errors++;
            this.setupConnections();
        });

        conn.on(connState.CLOSED, () => {
            this.delConnection(conn);
            this.live--;
            this.errors++;
            this.setupConnections();
        });

        conn.on(connState.ERROR, () => {
            this.setupConnections();
        });
    }

    private handleSEStateUpdates(conn: SEConnection): void {
        conn.on(connState.CONNECTED, () => {
            this.setState(ServiceEngineState.LIVE);
        });

        conn.on(connState.FAILED, () => {
            this.setState(ServiceEngineState.FAULTY);
        });

        conn.on(connState.ERROR, () => {
            this.setState(ServiceEngineState.FAULTY);
        });
    }

    private setState(state: ServiceEngineState) {
        if (this.state != state) {
            this.state = state;

            if (this.state == ServiceEngineState.FAULTY) {
                this.faultyTimer = setTimeout(() => {
                    this.handleFaultyTimerTimeout();
                }, 30000);
            }

            if (this.state == ServiceEngineState.LIVE) {
                if (this.faultyTimer !== undefined) {
                    clearTimeout(this.faultyTimer);
                }
            }
            this.emit(this.state);
        }
        console.log(this.getLiveness());
    }

    private setupConnections(): void {
        let liveness = this.getLiveness();
        if (liveness.limit > liveness.live + liveness.establishing) {
            let conn = new SEConnection(this.ip, this.port, config.get('http.host'));

            this.handleConnecitonCounts(conn);
            this.handleSEStateUpdates(conn);
        }
    }

    public getServiceEngineParams(): ServiceEngineInterface {
        return {
            name: this.name,
            ip: this.ip,
            port: this.port
        }
    }

    public startServiceEngine(): void {
        this.setupConnections();
    }

    public stopServiceEngine(): void {
        this.limit = 0;
        this.connections.forEach(conn => {
            conn.close();
        });
        this.setState(ServiceEngineState.SHUTDOWN);
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
        this.faultyTimer = null;
    }
}

export { ServiceEngine };
export { ServiceEngineState };
export { ServiceEngineInterface };