import "reflect-metadata";
import { createServer } from "http";
import { Server as SocketIoServer } from 'socket.io';
import setRoutes from "./routes";
import cache from "./utils/cache";

cache.set("onlineUsers", new Set<string>());

const httpServer = createServer();
const io = new SocketIoServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(",")
  }
});

//distributes the server object to all controllers
setRoutes(io);

export default httpServer;
