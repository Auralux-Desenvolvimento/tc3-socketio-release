import { Server } from "socket.io";
import publishAgreementAcceptance from "./controllers/agreement/publishAgreementAcceptance";
import publishAgreementCancellation from "./controllers/agreement/publishAgreementCancellation";
import publishAgreementProposal from "./controllers/agreement/publishAgreementProposal";
import publishAgreementRejection from "./controllers/agreement/publishAgreementRejection";
import getAllInterests from "./controllers/interest/getAllInterests";
import publishInterest from "./controllers/interest/publishInterest";
import publishMessage from "./controllers/message/publishMessage";
import publishSeen from "./controllers/message/publishSeen";
import connect from "./controllers/user/connect";
import list from "./controllers/user/list";
import onConnect from "./controllers/user/onConnect";
import onDisconnect from "./controllers/user/onDisconnect";
import auth from "./middlewares/auth";
import ICustomSocket from "./types/ICustomSocket";
import rateLimiter from "./utils/rateLimiter";

export default function setRoutes (io: Server) {
  //setting middlewares
  //limits the rate of requests
  io.use(rateLimiter);
  //authentication
  io.use(auth);

  io.on("connection", async (socket: ICustomSocket) => {
    // --Immediate actions:--
    //sets up the control for online users in server-side
    await onConnect(socket);
    //manages this same information, but to the clients
    connect(socket);
    //immediately sends a list of available users to chat
    await list(socket);
    //also sends a list of interests related to the user
    await getAllInterests(socket);

    // --Listeners:--
    //sets up the control for online users both in server-side and client-side
    onDisconnect(io, socket);
    //sets up the messaging system
    publishMessage(socket);
    //listener for agreement proposals
    publishAgreementProposal(socket);
    //listener for agreement acceptations
    publishAgreementAcceptance(socket, io);
    //listener for agreement rejections
    publishAgreementRejection(socket);
    //listener for agreement cancellation
    publishAgreementCancellation(socket);
    //listener for interest management
    publishInterest(socket);
    //listener for seen management
    publishSeen(socket);
  });
}