import { HTTPListener } from "./modules/HTTPListener/HTTPListener"
import { ServiceEngineManager, ServiceEngine } from "./modules/ServiceEngineManager/ServiceEngineManager"
import { ControllerConnector } from "./modules/ControllerConnector/ControllerConnector"
import * as config from "config"

let seManager = new ServiceEngineManager();

let cc = new ControllerConnector('10.10.0.5', 8080, 'cdnhandler/ws');

let listener = new HTTPListener(config.get('http.port'), config.get('http.host'));


