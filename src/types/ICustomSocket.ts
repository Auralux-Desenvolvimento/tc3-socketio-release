import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import Team from "../models/team";

export default interface ICustomSocket<T = DefaultEventsMap, U = DefaultEventsMap, V = DefaultEventsMap> extends Socket<T, U, V> {
  user?: Team;
}