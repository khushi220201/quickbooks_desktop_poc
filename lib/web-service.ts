import semver from "semver";
import uuid from "node-uuid";
import qbdRepository from "../app/repositories/qbdRepository";
import express from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";

const url = require("url");

dotenv.config();
// const app = express();
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.text({ type: 'text/xml' }));
// // Import routes
// app.get('/reuse-infra/qbd', (req, res) => {
//     console.log('req: ', req.query);

// });
const MIN_SUPPORTED_VERSION: string = "1.0.0";
const RECOMMENDED_VERSION: string = "2.0.1";

let webService: any;

let counter: number = 0;
let lastError: string = "";

const username: string = process.env.QB_USERNAME;
const password: string = process.env.QB_PASSWORD;
const companyFile: string = process.env.QB_COMPANY_FILE;

let requestQueue: any[] = [];

let qbXMLHandler: any = {};

webService = {
  QBWebConnectorSvc: {
    QBWebConnectorSvcSoap: {},
  },
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.serverVersion = function (
  args: any,
  callback: any
) {
  // console.log("args: ", args);
  //   console.log('req: ', req);
  const retVal: string = "0.2.0";
  console.log("1 from web-service: ");

  callback({
    serverVersionResult: { string: retVal },
  });
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.clientVersion = function (
  args: any,
  callback: any
) {
  console.log("2 from web-service: ");

  let retVal: string = "";
  const qbwcVersion: string =
    args.strVersion.split(".")[0] +
    "." +
    args.strVersion.split(".")[1] +
    "." +
    args.strVersion.split(".")[2];

  if (semver.lt(qbwcVersion, MIN_SUPPORTED_VERSION)) {
    retVal = "E:You need to upgrade your QBWebConnector";
  } else if (semver.lt(qbwcVersion, RECOMMENDED_VERSION)) {
    retVal = "W:It is recommended that you upgrade your QBWebConnector";
  }

  callback({
    clientVersionResult: { string: retVal },
  });
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.authenticate =
  async function (args: any, callback: any) {
    console.log("3 from web-service:");
    const authReturn: any[] = [uuid.v1()];

    const userId = 15;
    const { strUserName, strPassword } = args;

    const authenticatedUser = await qbdRepository.checkUserCredential(
      userId,
      strUserName,
      strPassword
    );
    if (
      authenticatedUser!=null &&
      args.strUserName.trim() === authenticatedUser.username &&
      args.strPassword.trim() === authenticatedUser.password
    ) {
      const updateConnection = async (id: any) => {
        const data = await qbdRepository.updateActiveConnection(id);
      };
      const updatedConnection = await updateConnection(userId);
      if (typeof qbXMLHandler.fetchRequests === "function") {
        qbXMLHandler.fetchRequests(function (err: any, requests: string[]) {
          console.log("err: ", err);
          requestQueue = requests;
          if (err || requestQueue.length === 0) {
            authReturn[1] = "NONE";
          } else {
            authReturn[1] = companyFile;
          }

          callback({
            authenticateResult: { string: [authReturn[0], authReturn[1]] },
          });
        });
      } else {
        // Fallback to 'NONE'
        authReturn[1] = "NONE";

        callback({
          authenticateResult: { string: [authReturn[0], authReturn[1]] },
        });
      }
    } else {
      // The username and password sent from
      // QBWC do not match was is set on the server.
      authReturn[1] = "nvu";

      callback({
        authenticateResult: { string: [authReturn[0], authReturn[1]] },
      });
    }
  };

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.sendRequestXML = function (
  args: any,
  callback: any
) {
  console.log("4 from web-service: ");

  // console.log('sendRequestXML: ');
  // console.log('args: ', args);
  let request: string = "";
  const totalRequests: number = requestQueue.length;

  if (counter < totalRequests) {
    request = requestQueue[counter];
    counter += 1;
  } else {
    request = "";
    counter = 0;
  }

  callback({
    sendRequestXMLResult: { string: request },
  });
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.receiveResponseXML =
  function (args: any, callback: any) {
    console.log("5 from web-service: ");

    const response: any = args.response;
    const hresult: any = args.hresult;
    const message: any = args.message;
    let retVal: number = 0;
    let percentage: number = 0;

    if (hresult) {
      console.log(
        "QB CONNECTION ERROR: " + args.message + " (" + args.hresult + ")"
      );
      lastError = message;
      retVal = -101;

      if (typeof qbXMLHandler.didReceiveError === "function") {
        qbXMLHandler.didReceiveError(hresult);
      }
    } else {
      if (typeof qbXMLHandler.handleResponse === "function") {
        qbXMLHandler.handleResponse(response);
      }
      percentage = !requestQueue.length
        ? 100
        : (counter * 100) / requestQueue.length;
      if (percentage >= 100) {
        counter = 0;
      }
      retVal = parseFloat(percentage.toFixed());
    }

    callback({
      receiveResponseXMLResult: { int: retVal },
    });
  };

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.connectionError = function (
  args: any,
  callback: any
) {
  console.log("6 from web-service: ");

  console.log(
    "QB CONNECTION ERROR: " + args.message + " (" + args.hresult + ")"
  );
  lastError = args.message;
  const retVal: string = "DONE";

  callback({
    connectionErrorResult: { string: retVal },
  });
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.getLastError = function (
  args: any,
  callback: any
) {
  console.log("7 from web-service: ");

  const retVal: string = lastError;

  callback({
    getLastErrorResult: { string: retVal },
  });
};

webService.QBWebConnectorSvc.QBWebConnectorSvcSoap.closeConnection = function (
  args: any,
  callback: any
) {
  console.log("8 from web-service: ");

  const retVal: string = "OK";

  callback({
    closeConnectionResult: { string: retVal },
  });
};

module.exports = {
  service: webService,

  setQBXMLHandler: function (xmlHandler: any) {
    qbXMLHandler = xmlHandler;
  },
};

// const authenticateUser = async (id: any) => {
//     console.log('authenticateUser: ');
//   const data = await qbdRepository.checkUserCredential(id);
//   return data;
// };
