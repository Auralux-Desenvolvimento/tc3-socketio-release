import { getConnection } from "typeorm";
import Agreement from "../../models/agreement";
import Chat from "../../models/chat";
import Message from "../../models/message";
import User from "../../models/user";
import ICustomSocket from "../../types/ICustomSocket";
import IMessageSubscribe from "../../types/IMessageSubscribe";
import ITeam, { IAgreement } from "../../types/ITeam";
import cache from "../../utils/cache";
import getConnectedTeams from "../../utils/queries/getConnectedTeams";

export default async function list (socket: ICustomSocket) {
  const { user } = socket;
  if (user) {
    const connection = getConnection();
    
    const teamsQuery = getConnectedTeams(user.id, connection)
      .select("team.id", "id")
      .addSelect("user.name", "name")
      .addSelect("team.logo_url", "logo")
      .addSelect("coalesce(chat.status, 'inactive')", "status")
      .addSelect("chat.id", "chatId")
      .addSelect("team.last_seen", "lastSeen")
      .innerJoin(User, "user", "user.id = team.user_id")
      .leftJoin(Chat, "chat", "(chat.team1_id = team.id AND chat.team2_id = :statusT2) OR (chat.team1_id = :statusT1 AND chat.team2_id = team.id)", { statusT2: user.id, statusT1: user.id })
    ;

    const teams: ITeam[] = await teamsQuery.getRawMany();
    for (let team of teams) {
      if (team.chatId) {
        const messagesQuery = connection.createQueryBuilder()
          .select("message.agent_id", "from")
          .addSelect("message.content", "content")
          .addSelect("message.seen", "seen")
          .addSelect("message.created_at", "createdAt")
          .from(Message, "message")
          .where("message.chat_id = :chatId", { chatId: team.chatId })
          .orderBy("message.createdAt", "ASC")
        ;
        
        //converting timestamps to Date objects
        const messages: IMessageSubscribe[] = await messagesQuery.getRawMany();
        messages.map(e => {
          e.createdAt = new Date(e.createdAt);
          e.seen = Boolean(e.seen);
          return e;
        })
        team.messages = messages;
        team.lastSeen = new Date(team.lastSeen);

        const agreementQuery = connection.createQueryBuilder()
          .select("agreement.status", "status")
          .addSelect("agreement.agent_id", "agent")
          .from(Agreement, "agreement")
          .where("agreement.chat_id = :chatId", { chatId: team.chatId })
          .orderBy("agreement.created_at", "DESC")
        ;

        const agreement = await agreementQuery.getRawOne<IAgreement>();
        team.agreement = agreement;
      } else {
        team.messages = [];
      }

      //getting the connected status
      const onlineUsers = cache.get("onlineUsers") as Set<string>;
      const connected = onlineUsers.has(team.id);
      team.connected = connected;
    }
    socket.emit("user/list", teams);
  }
}