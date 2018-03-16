import * as http from "http"
import * as net from "net"
import * as config from "config"
import * as EventEmitter from "events"

class ServiceEngine extends EventEmitter {
    private agent: http.Agent;
    private connections: net.Socket[];
    private concurrent_connection_limit: number;

    private live_connections: number;

    private ip: string;
    private port: number;

    public addConnection(connection: net.Socket) {
        this.connections.push(connection);
    }

    public setupConnections(): void {
        console.log('Trying to establish ' + this.concurrent_connection_limit.toString() + ' connections');
        for (let i = 0; i < this.concurrent_connection_limit; i++) {
            let connectionOptions: net.TcpSocketConnectOpts = {
                host: this.ip,
                port: this.port,
                family: 4,
                localAddress: config.get('http.host')
            };

            let sock = net.createConnection(connectionOptions, () => {
                console.log('Connected to server');
                this.live_connections++;
                console.log(`Liveness is ${this.live_connections}/${this.concurrent_connection_limit}`);
            });

            sock.on('connect', () => {
                console.log('Connection established to ' + this.ip);
                this.addConnection(sock);
            });

            sock.on('timeout', () => {
                console.error('Connection failed to ' + this.ip);
            });

            sock.on('error', (err) => {
                console.error(err);
                console.error('Failed to create connection to '+ this.ip);
            });

            sock.on('close', (hadError) => {
                if (hadError) {
                    console.error('Socket ended unsuccessfully');
                }
                this.live_connections--;
                this.connections = this.connections.filter((e) => {
                    return (e !== sock);
                });
            });
        }
    }

    constructor(ip: string, port: number) {
        super();
        this.ip = ip;
        this.port = port;
        this.agent = new http.Agent();
        this.concurrent_connection_limit = 5;
        this.live_connections = 0;
        this.connections = [];
        this.setupConnections();
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
        this.serviceEngines.push(se);
    }


}

export { ServiceEngineManager };
export { ServiceEngine };