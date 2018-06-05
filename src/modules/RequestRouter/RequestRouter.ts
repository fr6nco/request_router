import { ServiceEngine, ServiceEngineState } from "./ServiceEngine";
import { ControllerConnector, ControllerConnectorStates } from "../ControllerConnector/ControllerConnector";
import * as Bluebird from "bluebird"


interface RouterInformation {
    ip: string;
    port: number;
    cookie: number;
}

class RequestRouter {
    private serviceEngines: Array<ServiceEngine> = [];
    private controller: ControllerConnector;
    private controllerState: ControllerConnectorStates;
    private ip: string;
    private port: number;
    private cookie: number;

    private listenEvents(se: ServiceEngine) {
        se.on(ServiceEngineState.FAULTY, () => {
            this.controller.disableSe(se.getServiceEngineParams(), this.getRouterInformation())
                .then((message) => {
                    console.log(message);
                })
                .catch((err) => {
                    console.error(err);
                });
        });
        se.on(ServiceEngineState.LIVE, () => {
            this.controller.enableSe(se.getServiceEngineParams(), this.getRouterInformation())
                .then((message) => {
                    console.log(message);
                })
                .catch((err) => {
                    console.error(err);
                });
        });
        se.on(ServiceEngineState.DEAD, () => {
            this.controller.delSe(se.getServiceEngineParams(), this.getRouterInformation())
                .then((message) => {
                    console.log(message);
                    se.removeAllListeners();
                })
                .catch((err) => {
                    console.error(err);
                });
        });
        se.on(ServiceEngineState.SHUTDOWN, () => {
            this.controller.delSe(se.getServiceEngineParams(), this.getRouterInformation())
                .then((message) => {
                    console.log(message);
                    se.removeAllListeners();
                })
                .catch((err) => {
                    console.error(err);
                });
        })
    }

    private registerRouter() {
        if (this.isControllerActive()) {
            this.controller.registerRouter(this.getRouterInformation())
                .then((cookie) => {
                    console.log('Router Registered Using Cookie ' + cookie);
                    this.cookie = cookie;

                    //Register Service Engines, once the router is registered
                    this.getServiceEngines().forEach((se: ServiceEngine) => {
                        this.checkAndRegisterSe(se);
                    });
                })
                .catch((err) => {
                    console.log('Failed to register Request Router');
                    process.exit(10);
                });
        } else {
            console.log('Controller Connector not yet connected, not registering router');
        }
    }

    private checkAndRegisterSe(se: ServiceEngine) {
        if (this.isControllerActive()) {
            this.registerSe(se)
                .then((message) => {
                    se.HandleConnections();
                })
                .catch((err) => {
                    console.error('Failed to register service engine: ' + err);
                });
        } else {
            console.log('Cold not register SE, Connector not ready yet');
        }
    }

    private registerSe(se: ServiceEngine): Bluebird<any> {
        this.listenEvents(se);
        return new Bluebird.Promise((resolve, reject) => {
            this.controller.registerSe(se.getServiceEngineParams(), this.getRouterInformation())
                .then((message) => {
                    resolve(message);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    private watchController() {
        this.controller.on(ControllerConnectorStates.CONNECTED, () => {
            this.controllerState = ControllerConnectorStates.CONNECTED;
            this.registerRouter();
        });

        this.controller.on(ControllerConnectorStates.CLOSED, () => {
            this.controllerState = ControllerConnectorStates.CLOSED;
        });
    }

    private isControllerActive() {
        return this.controllerState == ControllerConnectorStates.CONNECTED;
    }

    public getServiceEngines(): Array<ServiceEngine> {
        return this.serviceEngines;
    }

    public addServiceEngine(se: ServiceEngine) {
        this.serviceEngines.push(se);
        this.checkAndRegisterSe(se);
    }

    public removeServiceEngine(se: ServiceEngine) {
        se.stopServiceEngine();
        this.serviceEngines = this.serviceEngines.filter(e => e != se);
    }

    public getRouterInformation(): RouterInformation {
        return {
            ip: this.ip,
            port: this.port,
            cookie: this.cookie
        };
    }

    constructor(ip: string, port: number, controller: ControllerConnector) {
        this.ip = ip;
        this.port = port;
        this.controller = controller;
        this.watchController();
        this.registerRouter();
    }
}

export { RequestRouter };
export { RouterInformation };
