import { getCustomRepository } from "typeorm";
import { IAppErrorLiteral, INTERNAL_SERVER_ERROR } from "../../errors";
import Message from "../../models/message";
import Team from "../../models/team";
import ChatRepo from "../../repos/chat";
import MessageRepo from "../../repos/message";
import ICustomSocket from "../../types/ICustomSocket";
import IMessagePublish from "../../types/IMessagePublish";
import IMessageSubscribe from "../../types/IMessageSubscribe";

export default function publishMessage (socket: ICustomSocket) {
  socket.on("user/message", async ({ content, to }: IMessagePublish) => {
    const { user } = socket;
    if (user) {
      const chatRepo = getCustomRepository(ChatRepo);
      let chat = await chatRepo.findOne({
        where: [
          { team1: to, team2: user.id },
          { team1: user.id, team2: to }
        ]
      });
      if (!chat) {
        return socket.emit("user/message/error", INTERNAL_SERVER_ERROR);
      }

      let message = new Message();
      message.subject = { id: to } as Team;
      message.agent = user;
      message.content = content;
      message.chat = chat;
      const messageRepo = getCustomRepository(MessageRepo);
      try {
        message = await messageRepo.Save(message) as Message;
      } catch (error: any) {
        return socket.emit("user/message/error", {
          code: error.operationCode,
          message: error.message,
          details: error.details
        } as IAppErrorLiteral);
      }
      
      socket.to(to).emit("user/message", {
        content,
        createdAt: message.createdAt,
        from: user.id,
        seen: false
      } as IMessageSubscribe);
    }
  });
}