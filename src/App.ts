import {HTTPListener, } from "./modules/HTTPListener/HTTPListener"
import * as config from "config"

const listener = new HTTPListener(config.get('http.port'), config.get('http.host'));