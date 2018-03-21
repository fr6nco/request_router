import * as http from "http"

export class HTTPListener {
    private port: number;
    private server: http.Server;
    private host: string;

    constructor(port: number, host: string) {
        this.port = port;
        this.host = host;
        this.server = http.createServer((req, res) => {
            console.log(req);
            res.end();
        });
        this.server.on('clientError', (err, socket) => {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this.server.listen(this.port, this.host, () => {
            console.log(`listening on port ${ this.port }`);
        });
    }
}
