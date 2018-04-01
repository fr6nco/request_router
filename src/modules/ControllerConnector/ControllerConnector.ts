import * as q from "bluebird"
import * as EventEmitter from "events"
import { ServiceEngineInterface } from "../ServiceEngineManager/ServiceEngineManager"

const WebSocket = require("rpc-websockets").Client
const WebSocketServer = require('rpc-websockets').Server

export enum ControllerConnectorEvents {
    CONNECTED = "CONNECTED",
    ERROR = "ERROR"
}

export class ControllerConnector extends EventEmitter{

    private controllerIP: string;
    private controllerPort: number;
    private wsurl: string;

    private rrip: string;
    private rrport: number;

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
            this.wsClient.call('hello', [this.rrip, this.rrport]).then((res: any) => {
                this.emit(ControllerConnectorEvents.CONNECTED);
                console.log(res);
            })
            .catch((err: any) => {
                console.error(err);
            })
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

    public registerSe(se: ServiceEngineInterface): void {
        this.wsClient.call('registerse', [se.ip, se.port]).then((res: any) => {
            console.log(res);
        })
        .catch((err: any) => {
            console.error(err);
        });
    }

    public enableSe(se: ServiceEngineInterface): void {
        this.wsClient.call('enablese', [se.ip, se.port]).then((res: any) => {
            console.log(res);
        })
        .catch((err: any) => {
            console.error(err);
        });
    }

    public disableSe(se: ServiceEngineInterface): void {
        this.wsClient.call('disablese', [se.ip, se.port]).then((res: any) => {
            console.log(res);
        })
        .catch((err: any) => {
            console.error(err);
        });
    }

    public delSe(se: ServiceEngineInterface): void {
        this.wsClient.call('delse', [se.ip, se.port]).then((res: any) => {
            console.log(res);
        })
        .catch((err: any) => {
            console.error(err);
        });
    }

    constructor(host: string, port: number, url: string, rrip: string, rrport: number) {
        super();
        this.controllerIP = host;
        this.controllerPort = port;
        this.wsurl = url;
        this.rrip = rrip;
        this.rrport = rrport;
        this.connect();
    }
}