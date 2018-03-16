import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngineManager, ServiceEngine } from "./modules/ServiceEngineManager/ServiceEngineManager"
import * as config from "config"


let seManager = new ServiceEngineManager();

let se = new ServiceEngine('10.10.0.2', 80);

seManager.addServiceEngine(se);

//Starts the listener
let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));


