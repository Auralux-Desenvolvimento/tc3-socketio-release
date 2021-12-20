import { getConnection } from "typeorm";
import ICustomSocket from "../../types/ICustomSocket";
import cache from "../../utils/cache";
import getConnectedTeams from "../../utils/queries/getConnectedTeams";

export default async function onConnect (socket: ICustomSocket) {
  const { user } = socket;
  if (user) {
    //add user to the online list
    const onlineUsers = cache.get("onlineUsers") as Set<string>;
    onlineUsers.add(user.id);
    cache.set("onlineUsers", onlineUsers);

    //add user to all necessary rooms (rooms of other users that are connected with this one)
    //with this, we'll be able to broadcast an event to users that are connected with a certain user 
    const connection = getConnection()
    const teamConnectionsQuery = getConnectedTeams(user.id, connection)
      .select("team.id", "id")
      .andWhere("team.is_active = true")
    ;
    const teamConnections = await teamConnectionsQuery.getRawMany<{ id: string }>();
    for (let { id } of teamConnections ) {
      socket.join(`connection/${id}`);
    }
  }
}