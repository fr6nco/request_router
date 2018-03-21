import * as zeromq from "zeromq"
import * as Promise from "bluebird"

export class ControllerConnector {

    private controllerIP: string;
    private controllerPort: number;

    private zmq_sock: zeromq.Socket;
    private connectretries: number = 0;
    private MAXCONNECTRETRIES: number = 5;

    private status: string;

    public connect() {
        return new Promise.Promise((resolve, reject) => {
            this.status = 'CONNECTING';
            console.log('Trying to establish zMQ connection to ' + `tcp://${this.controllerIP}:${this.controllerPort}`);

            this.zmq_sock = zeromq.socket('pair');

            this.zmq_sock.on('connect', (socket) => {
                this.status = 'CONNECTED';
                console.log(`Succesfully connected to messaging intereface to controller on tcp://${this.controllerIP}:${this.controllerPort}`);
                return resolve();
            });

            this.zmq_sock.on('connect_retry', (msg) => {
                this.connectretries++;
                if (this.connectretries >= this.MAXCONNECTRETRIES) {
                    console.log('Failed to connect to server');
                    this.zmq_sock.close();
                    this.status = 'ERROR';
                    //Perhaps this should be an observable as reject might come after resolve;
                    //TODO
                    return reject('maxretries exceeded');
                }
            });

            this.zmq_sock.on('err', (msg) => {
                this.status = 'DISCONNECTED';
                return reject(msg);
            });

            this.zmq_sock.monitor();
            this.zmq_sock.connect(`tcp://${this.controllerIP}:${this.controllerPort}`);
            this.zmq_sock.send('HelloWorld');
        });
    }

    constructor(host: string, port: number) {
        this.controllerIP = host;
        this.controllerPort = port;
        this.zmq_sock = zeromq.socket('pair');
    }
}