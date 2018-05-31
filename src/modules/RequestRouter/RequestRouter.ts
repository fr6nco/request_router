import { ServiceEngine, ServiceEngineState } from "./ServiceEngineManager";
import { ControllerConnector } from "../ControllerConnector/ControllerConnector";

interface RouterInformation {
    ip: string;
    port: number;
    cookie: number;
}

class RequestRouter {
    private serviceEngines: Array<ServiceEngine> = [];
    private controller: ControllerConnector;
    private ip: string;
    private port: number;
    private cookie: number;

    constructor(ip: string, port: number, controller: ControllerConnector) {
        this.ip = ip;
        this.port = port;
        this.controller = controller;
        this.registerRouter();
    }

    private listenEvents(se: ServiceEngine) {
        se.on(ServiceEngineState.FAULTY, () => {
            this.controller.disableSe(se.getServiceEngineParams(), this.getRouterInformation());
        });
        se.on(ServiceEngineState.LIVE, () => {
            this.controller.enableSe(se.getServiceEngineParams(), this.getRouterInformation());
        });
        se.on(ServiceEngineState.DEAD, () => {
            this.controller.delSe(se.getServiceEngineParams(), this.getRouterInformation());
        });
    }

    private registerRouter() {
        this.controller.registerRouter(this.getRouterInformation()).then((cookie) => {
            this.cookie = cookie;
        });
    }

    private registerSe(se: ServiceEngine) {
        this.controller.registerSe(se.getServiceEngineParams(), this.getRouterInformation());
    }

    public getServiceEngines(): Array<ServiceEngine> {
        return this.serviceEngines;
    }

    public addServiceEngine(se: ServiceEngine) {
        // this.listenEvents(se);
        this.registerSe(se);
        this.serviceEngines.push(se);
    }

    public getRouterInformation(): RouterInformation {
        return {
            ip: this.ip,
            port: this.port,
            cookie: this.cookie
        };
    }
}

export { RequestRouter };
export { RouterInformation };
