import server from '../lib/server';
import qbXMLHandler from './qbXMLHandler';


server.setQBXMLHandler(qbXMLHandler);
server.run();
