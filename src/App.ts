import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngineManager, ServiceEngine } from "./modules/ServiceEngineManager/ServiceEngineManager"
import { ControllerConnector } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

let seManager = new ServiceEngineManager();

let cc = new ControllerConnector('10.10.0.5', 8080, 'cdnhandler/ws');


//At this point we need to get the list of SEs

let se = new ServiceEngine('10.10.0.2', 80);
seManager.addServiceEngine(se)

let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));

process.on('SIGINT', () => {
    console.log('SIGINT caputed, waiting for ws connection to close');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});