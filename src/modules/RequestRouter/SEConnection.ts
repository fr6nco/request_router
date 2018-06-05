import * as EventEmitter from "events"
import * as net from "net"
import * as config from "config"

export enum connState {
    ESTABLISHING = 'ESTABLISHING',
    CONNECTED = 'CONNECTED',
    ERROR = 'ERROR',
    CLOSED = 'CLOSED',
    FAILED = 'FAILED'
}

//Connection class
export class SEConnection extends EventEmitter {
    socket: net.Socket;
    source_ip: string;
    source_port: number;
    dest_ip: string;
    dest_port: number
    state: connState;
    wasConnected: boolean;

    public constructor(dest_ip: string, dest_port: number, source_ip: string) {
        super();
        this.source_ip = source_ip;
        this.dest_ip = dest_ip;
        this.dest_port = dest_port;
        this.state = connState.ESTABLISHING;
        this.wasConnected = false;
        this.connect();
    }

    //Wraps setting state and emits state
    private setAndEmitState(state: connState) {
        this.state = state;
        this.emit(state);
    }

    //Starts connection
    private connect() {
        let connectionOptions: net.TcpSocketConnectOpts = {
            host: this.dest_ip,
            port: this.dest_port,
            family: 4,
            localAddress: config.get('http.host')
        };

        this.socket = net.createConnection(connectionOptions, () => {
            this.source_port = this.socket.localPort;
            console.log(`Connected to Service Engine on ${this.source_ip}:${this.source_port} <->${this.dest_ip}:${this.dest_port}`);
            this.wasConnected = true;
            this.setAndEmitState(connState.CONNECTED);
        });

        this.socket.on('error', (err) => {
            console.error('Failed to establish connection');
        })

        this.socket.on('close', (hadError) => {
            if(hadError) {
                if(this.wasConnected) {
                    this.setAndEmitState(connState.FAILED);
                } else {
                    this.setAndEmitState(connState.ERROR);
                }
            } else {
                this.setAndEmitState(connState.CLOSED);
            }
        });
    }

    public close(): void {
        this.socket.destroy();
    }
}