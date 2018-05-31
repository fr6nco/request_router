import * as Bluebird from "bluebird"
import * as EventEmitter from "events"

import { ServiceEngineInterface } from "../RequestRouter/ServiceEngineManager"
import { RequestRouter, RouterInformation } from "../RequestRouter/RequestRouter"

const WebSocket = require("rpc-websockets").Client
const WebSocketServer = require('rpc-websockets').Server

export enum ControllerConnectorEvents {
    CONNECTED = "CONNECTED",
    ERROR = "ERROR",
}

export class ControllerConnector extends EventEmitter {
    private controllerIP: string;
    private controllerPort: number;
    private wsurl: string;

    private wsClient: any;

    public connect() {
        console.log(`trying to connect to ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);
        this.wsClient = new WebSocket(`ws://${this.controllerIP}:${this.controllerPort}/${this.wsurl}`);

        this.wsClient.on('open', () => {
            console.log('Connected to websocket');
            this.emit(ControllerConnectorEvents.CONNECTED);
        });

        this.wsClient.on('error', (err: any) => {
            console.error(err);
            this.emit(ControllerConnectorEvents.ERROR);
        });

        this.wsClient.on('close', () => {
            console.log('ws endpoint closed');
        });

        process.on('SIGINT', () => {
            console.log('Cleaning up');
            //TODO cleanup if needed
            this.wsClient.close();
        });
    }

    public registerRouter(rr: RouterInformation): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            this.wsClient.call('hello', [rr.ip, rr.port])
                .then((res: any) => {
                    let retobj = JSON.parse(res);
                    if (retobj.code == 200) {
                        resolve(retobj.cookie);
                    } else if (retobj.code == 500) {
                        reject(retobj.error);
                    }
                })
                .catch((err: any) => {
                    //TODO handle disconnection / error
                    console.error(err);
                    this.emit(ControllerConnectorEvents.ERROR);
                });
        });
    }

    public unregisterRouter(rr: RequestRouter): Bluebird<any> {
        return new Bluebird.Promise((resolve, reject) => {
            let delseCommands: Array<Bluebird<any>> = new Array();
            let routerinfo = rr.getRouterInformation();

            rr.getServiceEngines().forEach(se => {
                delseCommands.push(this.delSe(se.getServiceEngineParams(), routerinfo));
            });

            Bluebird.all(delseCommands)
                .then((res) => {
                    console.log('All service engines removed');

                    //TODO CALL THE ACTUAL UNREGISTER COMMAND
                })
                .catch((err) => {
                    console.error('Error while removing service engines');
                    console.error(err);
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
                    } else if (retobj.code == 500) {
                        reject(retobj.error);
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
                    } else if (retobj.code == 500) {
                        reject(retobj.error);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
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
                    } else if (retobj.code == 500) {
                        reject(retobj.error);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
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
                    } else if (retobj.code == 500) {
                        reject(retobj.error);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    constructor(host: string, port: number, url: string) {
        super();
        this.controllerIP = host;
        this.controllerPort = port;
        this.wsurl = url;
        this.connect();
    }
}