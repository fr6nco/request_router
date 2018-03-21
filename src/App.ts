import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngineManager, ServiceEngine } from "./modules/ServiceEngineManager/ServiceEngineManager"
import { ControllerConnector } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

let seManager = new ServiceEngineManager();

let cc = new ControllerConnector('10.10.0.5', 3000);
cc.connect()
.then(() => {
    console.log('Connected to controller via zMQ');
    let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));

    // let se = new ServiceEngine('10.10.0.2', 80);
    // seManager.addServiceEngine(se);
}).catch((err) => {
    console.error('Failed to make zMQ connection');
    process.exit(1);
});


