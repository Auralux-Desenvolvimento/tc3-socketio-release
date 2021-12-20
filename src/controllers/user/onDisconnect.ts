import { Server } from "socket.io";
import { getCustomRepository } from "typeorm";
import Team from "../../models/team";
import TeamRepo from "../../repos/team";
import ICustomSocket from "../../types/ICustomSocket";
import cache from "../../utils/cache";

export default function onDisconnect (io: Server, socket: ICustomSocket) {
  socket.on("disconnect", async () => {
    let { user } = socket;
    if (user) {
      //gets all sockets in the user room
      const matchingSockets = await io.in(user.id).allSockets();
      //if there are no more sockets, warns other users of this disconnection and persists it to the server
      if (matchingSockets.size === 0) {
        const onlineUsers = cache.get("onlineUsers") as Set<string>;
        onlineUsers.delete(user.id);
        cache.set("onlineUsers", onlineUsers);

        //updates the user's "lastSeen" status
        const teamRepo = getCustomRepository(TeamRepo);
        await teamRepo.update({ id: user.id }, { lastSeen: new Date() });

        socket.broadcast.to(`connection/${user.id}`).emit("user/disconnect", user.id);
      }
    }
  })
}