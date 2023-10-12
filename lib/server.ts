import  http from 'http';
import  fs from 'fs';
const soap = require('soap');

const server = http.createServer((req, res) => {
    // console.log("in")
    // console.log('req: ', req);
    res.end('404: Not Found: ' + req.url);
});

const port = process.env.QB_SOAP_PORT || 8000;

const WSDL_FILENAME = '/qbws.wsdl';

function buildWsdl(): string {
    const wsdl = fs.readFileSync(__dirname + WSDL_FILENAME, 'utf8');
    return wsdl;
}

class Server {
    private wsdl: string;
    private webService: any;
    
    constructor() {
        this.wsdl = buildWsdl();
        this.webService = require('./web-service');
    }

    public run(): void {
        let soapServer: any;
        server.listen(port);
        soapServer = soap.listen(server, '/reuse-infra/qbd', this.webService.service, this.wsdl);
        console.log('Quickbooks SOAP Server listening on port ' + port);
    }

    public setQBXMLHandler(qbXMLHandler: any): void {
        this.webService.setQBXMLHandler(qbXMLHandler.fetchRequests);
    }
}

export default new Server();