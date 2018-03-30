import * as q from "bluebird"

const WebSocket = require("rpc-websockets").Client
const WebSocketServer = require('rpc-websockets').Server

export class ControllerConnector {

    private controllerIP: string;
    private controllerPort: number;
    private wsurl: string;

    private wsClient: any;
    private wsServer: any;
    private connectretries: number = 0;
    private MAXCONNECTRETRIES: number = 5;

    private status: string;

    public connect() {
        console.log(`trying to connect to ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);
        this.wsClient = new WebSocket(`ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);

        this.wsClient.on('open', () => {
            console.log('Connected to websocket');
            this.wsClient.call('hello').then((res: any) => {
                console.log(res);
            });
        });

        this.wsClient.on('error', (err: any) => {
            console.error(err);
            process.exit(1);
        });

        this.wsClient.on('close', () => {
            console.log('ws endpoint closed');
        });

        process.on('SIGINT', () => {
            console.log('Closing WS endpoint');
            this.wsClient.close();
        });
    }

    constructor(host: string, port: number, url: string) {
        this.controllerIP = host;
        this.controllerPort = port;
        this.wsurl = url;
        this.connect();
    }
}