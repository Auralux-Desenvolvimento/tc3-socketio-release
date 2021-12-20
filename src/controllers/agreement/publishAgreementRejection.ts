import { Brackets, getCustomRepository } from "typeorm";
import AppError, { IAppErrorLiteral } from "../../errors";
import { AgreementStatus } from "../../models/agreement";
import AgreementRepo from "../../repos/agreement";
import ChatRepo from "../../repos/chat";
import ICustomSocket from "../../types/ICustomSocket";

export default function publishAgreementRejection (socket: ICustomSocket) {
  socket.on("user/agreement/reject", async (id: string) => {
    const { user } = socket;
    if (user) {
      const chatRepo = getCustomRepository(ChatRepo);
      const agreementRepo = getCustomRepository(AgreementRepo);      

      const chatQuery = chatRepo.createQueryBuilder("chat")
        .where(new Brackets(qb => {
          qb.where("chat.team1_id = :team11", { team11: user.id })
            .andWhere("chat.team2_id = :team21", { team21: id })
        }))
        .orWhere(new Brackets(qb => {
          qb.where("chat.team1_id = :team12", { team12: id })
            .andWhere("chat.team2_id = :team22", { team22: user.id })
        }))
      ;

      const chat = await chatQuery.getOne();
      if (!chat) {
        return socket.emit("user/agreement/reject/error", {
          code: 1,
          message: "There is no active conversation with the mentioned team"
        } as IAppErrorLiteral);
      }

      const agreement = await agreementRepo.findOne({
        chat,
        status: AgreementStatus.pending
      });

      if (!agreement) {
        return socket.emit("user/agreement/reject/error", {
          code: 0,
          message: "There is no pending agreement proposal"
        } as IAppErrorLiteral);
      }

      agreement.status = AgreementStatus.rejected;
      
      try {
        await agreementRepo.Save(agreement);
      } catch (err) {
        const error: AppError = err as any;
        return socket.emit("user/agreement/reject/error", {
          code: error.operationCode,
          message: error.message,
          details: error.details
        } as IAppErrorLiteral);
      }

      return socket.to(id).emit("user/agreement/reject", user.id);
    }
  })
}