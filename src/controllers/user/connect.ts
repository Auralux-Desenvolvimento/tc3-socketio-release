import ICustomSocket from "../../types/ICustomSocket";

export default function connect (socket: ICustomSocket) {
  const { user } = socket;
  if (user) {
    //emits a user/connect event to all users that have a connection with this user
    socket.broadcast.to(`connection/${user.id}`).emit("user/connect", user.id);
  }
}