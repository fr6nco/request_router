import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngineManager, ServiceEngine } from "./modules/ServiceEngineManager/ServiceEngineManager"
import { ControllerConnector, ControllerConnectorEvents } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));
let cc = new ControllerConnector('10.10.0.5', 8080, 'cdnhandler/ws', config.get('http.host'), config.get('http.port'));

// cc.on(ControllerConnectorEvents.CONNECTED, () => {
//     let seManager = new ServiceEngineManager(cc);
//     let se = new ServiceEngine('se1', '10.10.0.2', 80);
//     seManager.addServiceEngine(se)
// });

process.on('SIGINT', () => {
    console.log('SIGINT captured, waiting for ws connection to close');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
