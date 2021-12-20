import { Brackets, getCustomRepository } from "typeorm";
import AppError, { IAppErrorLiteral } from "../../errors";
import Agreement, { AgreementStatus } from "../../models/agreement";
import AgreementRepo from "../../repos/agreement";
import ChatRepo from "../../repos/chat";
import ICustomSocket from "../../types/ICustomSocket";

export default function publishAgreementProposal (socket: ICustomSocket) {
  socket.on("user/agreement/propose", async (id: string) => {
    const { user } = socket;
    if (user) {
      const chatRepo = getCustomRepository(ChatRepo);
      const agreementRepo = getCustomRepository(AgreementRepo);

      const agreementUserSubquery = agreementRepo.createQueryBuilder("agreement")
        .select("agreement.agent_id", "agentId")
        .where("agreement.agent_id = :userId", { userId: user.id })
        .andWhere("agreement.status = 'active'")
      ;

      const agreementSubjectSubquery = agreementRepo.createQueryBuilder("agreement")
        .select("agreement.agent_id", "agentId")
        .where("agreement.agent_id = :subjectId", { subjectId: id })
        .andWhere("agreement.status = 'active'")
      ;

      const chatQuery = chatRepo.createQueryBuilder("chat")
        .where(new Brackets(query => {
          query.where(new Brackets(qb => {
            qb.where("chat.team1_id = :team11", { team11: user.id })
              .andWhere("chat.team2_id = :team21", { team21: id })
          }))
          .orWhere(new Brackets(qb => {
            qb.where("chat.team1_id = :team12", { team12: id })
              .andWhere("chat.team2_id = :team22", { team22: user.id })
          }))
        }))
        .andWhere(`:team13 not in (${agreementUserSubquery.getQuery()})`, { team13: user.id })
        .andWhere(`:team23 not in (${agreementSubjectSubquery.getQuery()})`, { team23: id })
        .setParameters(agreementUserSubquery.getParameters())
        .setParameters(agreementSubjectSubquery.getParameters())
      ;

      const chat = await chatQuery.getOne();
      if (!chat) {
        return socket.emit("user/agreement/propose/error", {
          code: 2,
          message: "There is no active conversation with the mentioned team"
        } as IAppErrorLiteral);
      }

      const preexistingAgreement = await agreementRepo.createQueryBuilder("agreement")
        .select("agreement.id", "id")
        .where("agreement.chat_id = :chatId", { chatId: chat.id })
        .getRawOne<{ id: string }>()
      ;

      if (!!preexistingAgreement) {
        return socket.emit("user/agreement/propose/error", {
          code: 1,
          message: "There already is an agreement in order"
        } as IAppErrorLiteral);
      }

      const agreement = new Agreement();
      agreement.agent = user;
      agreement.chat = chat;
      agreement.status = AgreementStatus.pending;
      
      try {
        await agreementRepo.Save(agreement);
      } catch (err) {
        const error: AppError = err as any;
        return socket.emit("user/agreement/propose/error", {
          code: error.operationCode,
          message: error.message,
          details: error.details
        } as IAppErrorLiteral);
      }

      return socket.to(id).emit("user/agreement/propose", user.id);
    }
  })
}