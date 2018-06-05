import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngine } from "./modules/RequestRouter/ServiceEngine"
import { RequestRouter } from "./modules/RequestRouter/RequestRouter"
import { ControllerConnector, ControllerConnectorStates } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

//Creates listener
let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));

//Creates instance of a controller connector the the main ryu controller
let cc = new ControllerConnector('10.10.0.5', 8080, 'cdnhandler/ws');

//Creates instance of a request router, connects to the main ryu controller
let requestRouter = new RequestRouter(config.get('http.host'), config.get('http.port'), cc);

//Adds service engine to a controller
let se = new ServiceEngine('se1', '10.10.0.2', 80);
requestRouter.addServiceEngine(se);

process.on('SIGINT', () => {
    console.log('SIGINT captured, waiting for ws connection to close');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
