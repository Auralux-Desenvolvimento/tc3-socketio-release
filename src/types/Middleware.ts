import { Server } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import ICustomSocket from "./ICustomSocket";

export type MiddlewareParam = (socket: ICustomSocket, next: (err?: ExtendedError | undefined) => void) => void;

export type Middleware = (cb: MiddlewareParam) => Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>;