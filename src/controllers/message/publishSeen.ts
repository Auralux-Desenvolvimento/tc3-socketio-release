import { getConnection } from "typeorm";
import { IAppErrorLiteral } from "../../errors";
import Chat from "../../models/chat";
import Message from "../../models/message";
import ICustomSocket from "../../types/ICustomSocket";

export default function publishSeen (socket: ICustomSocket) {
  socket.on("user/message/seen", async (chatId) => {
    const { user } = socket;
    if (user) {
      const connection = getConnection();

      const chatIds = await connection.createQueryBuilder()
        .select("chat.team1_id", "team1Id")
        .addSelect("chat.team2_id", "team2Id")
        .from(Chat, "chat")
        .where("chat.id = :chatId", { chatId })
        .getRawOne<{ team1Id: string, team2Id: string } | undefined>()
      ;

      if (!chatIds) {
        return socket.emit("user/message/seen/error", {
          code: 1,
          message: "There is no chat with this id"
        } as IAppErrorLiteral);
      }

      try {
        await connection.createQueryBuilder()
          .update(Message)
          .set({ seen: true })
          .where("chat_id = :chatId", { chatId })
          .andWhere("agent_id <> :userId", { userId: user.id })
          .execute()
        ;
      } catch (error: any) {
        return socket.emit("user/message/seen/error", { 
          code: 2,
          message: error.message
        } as IAppErrorLiteral);
      }

      let to;
      if (chatIds.team1Id === user.id) {
        to = chatIds.team2Id;
      } else if (chatIds.team2Id === user.id) {
        to = chatIds.team1Id;
      }

      if (to) {
        socket.to(to).emit("user/message/seen", chatId);
      }
    }
  })
}