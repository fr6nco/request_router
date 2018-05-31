import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngine } from "./modules/RequestRouter/ServiceEngineManager"
import { RequestRouter } from "./modules/RequestRouter/RequestRouter"
import { ControllerConnector, ControllerConnectorEvents } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));
let cc = new ControllerConnector('10.10.0.5', 8080, 'cdnhandler/ws');

cc.on(ControllerConnectorEvents.CONNECTED, () => {
    let seManager = new RequestRouter(config.get('http.host'), config.get('http.port'), cc);
    let se = new ServiceEngine('se1', '10.10.0.2', 80);
    seManager.addServiceEngine(se);
});

process.on('SIGINT', () => {
    console.log('SIGINT captured, waiting for ws connection to close');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
