import * as http from "http"

export class HTTPListener {
    port: number;
    server: http.Server;

    constructor(port: number) {
        this.port = port;
        this.server = http.createServer((req, res) => {
            res.end();
        });
        this.server.on('clientError', (err, socket) => {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this.server.listen(this.port, () => {
            console.log(`listening on port ${ this.port }`);
        });
    }
}
