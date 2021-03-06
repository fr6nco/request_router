import * as Bluebird from "bluebird"
import * as EventEmitter from "events"

import { ServiceEngineInterface } from "../RequestRouter/ServiceEngine"
import { RequestRouter, RouterInformation } from "../RequestRouter/RequestRouter"

const WebSocket = require("rpc-websockets").Client
const WebSocketServer = require('rpc-websockets').Server

enum ControllerConnectorStates {
    CONNECTED = "CONNECTED",
    CLOSED = "CLOSED"
}

class ControllerConnector extends EventEmitter {
    private controllerIP: string;
    private controllerPort: number;
    private wsurl: string;
    private state: ControllerConnectorStates;
    private wsClient: any;

    public connect() {
        console.log(`trying to connect to ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);
        this.wsClient = new WebSocket(`ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);

        this.wsClient.on('open', () => {
            this.setStateAndEmit(ControllerConnectorStates.CONNECTED);
        });

        this.wsClient.on('error', (err: any) => {
            console.error(err);
        });

        this.wsClient.on('close', () => {
            this.setStateAndEmit(ControllerConnectorStates.CLOSED);
        });

    }

    public registerRouter(rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {            
            this.wsClient.call('hello', [rr.ip, rr.port])
                .then((res: any) => {
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.message);
                    } else {
                        reject(retobj);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    public unregisterRouter(rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('goodbye', [rr.cookie])
                .then((res: any) => {
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200){
                        resolve(retobj.message);
                    } else {
                        reject(retobj);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    public registerSe(se: ServiceEngineInterface, rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('registerse', [rr.cookie, se.name, se.ip, se.port])
                .then((res: any) => {
                    console.log(res);
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.message);
                    } else {
                        reject(retobj.message);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    public enableSe(se: ServiceEngineInterface, rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('enablese', [rr.cookie, se.name])
                .then((res: any) => {
                    console.log(res);
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.message);
                    } else {
                        reject(retobj.message);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    public disableSe(se: ServiceEngineInterface, rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('disablese', [rr.cookie, se.name])
                .then((res: any) => {
                    console.log(res);
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.message);
                    } else {
                        reject(retobj.message);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    public delSe(se: ServiceEngineInterface, rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('delse', [rr.cookie, se.name])
                .then((res: any) => {
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.message);
                    } else {
                        reject(retobj.message);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    private setStateAndEmit(state: ControllerConnectorStates) {
        this.state = state;
        this.emit(state);
    }

    public getState(): ControllerConnectorStates {
        return this.state;
    }

    public close() {
        this.wsClient.close();
    }

    constructor(host: string, port: number, url: string) {
        super();
        this.controllerIP = host;
        this.controllerPort = port;
        this.wsurl = url;
        this.connect();
    }
}

export { ControllerConnectorStates };
export { ControllerConnector };