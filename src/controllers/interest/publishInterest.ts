import { getConnection, getCustomRepository } from "typeorm";
import * as yup from "yup";
import { IAppErrorLiteral } from "../../errors";
import Chat, { ChatStatus } from "../../models/chat";
import Interest from "../../models/interest";
import Team from "../../models/team";
import ChatRepo from "../../repos/chat";
import CourseRepo from "../../repos/course";
import InterestRepo from "../../repos/interest";
import TeamRepo from "../../repos/team";
import ICustomSocket from "../../types/ICustomSocket";
import isInAgreement from "../../utils/queries/isInAgreement";
import cache from "../../utils/cache";
import ITeam from "../../types/ITeam";

const schema = yup.object().shape({
  id: yup.string()
    .uuid("The subject team id must be an uuid")
    .required("The subject team id is required"),
  interest: yup.boolean()
    .required("The interest state is required")
});

interface IPublishInterest {
  interest: boolean;
  id: string
}

export default async function publishInterest (socket: ICustomSocket) {
  socket.on("user/interest", async ({ interest, id }: IPublishInterest) => {
    const agent = socket.user;
    if (agent) {
      try {
        await schema.validate({ id, interest });
      } catch (error: any) {
        return socket.emit("user/interest/error", { 
          code: 1,
          message: error.message
        } as IAppErrorLiteral);
      }
    
      if (agent.id === id) {
        return socket.emit("user/interest/error", {
          code: 2,
          message: "You cannot show interest to yourself"
        } as IAppErrorLiteral);
      }
    
      const connection = getConnection();
    
      const isAgentInAgreement = await isInAgreement(agent.id, connection)
        .getRawOne<{ id: string } | undefined>()
      ;
      if (isAgentInAgreement) {
        return socket.emit("user/interest/error", {
          code: 5,
          message: "You cannot show interest to other teams while in an agreement"
        } as IAppErrorLiteral);
      }
    
      const isSubjectInAgreement = await isInAgreement(id, connection)
        .getRawOne<{ id: string } | undefined>()
      ;
      if (isSubjectInAgreement) {
        return socket.emit("user/interest/error", {
          code: 6,
          message: "This team is already in an agreement"
        } as IAppErrorLiteral);
      }
    
      const teamRepo = getCustomRepository(TeamRepo);
      const subject = await teamRepo.findOne({
          where: { 
            id 
          },
          relations: [
            "user"
          ]
        }
      );
    
      if (!subject) {
        return socket.emit("user/interest/error", {
          code: 3,
          message: "There is no team with the id indicated in the request parameters"
        } as IAppErrorLiteral);
      }
    
      const interestRepo = getCustomRepository(InterestRepo);
      const previousInterest = await interestRepo.findOne({
        where: {
          agent,
          subject
        }
      });
    
      if (previousInterest) {
        return socket.emit("user/interest/error", {
          code: 4,
          message: "This team has already been shown interest by you."
        } as IAppErrorLiteral);
      }
    
      const interestObj = new Interest();
      interestObj.agent = agent;
      interestObj.subject = subject;
      interestObj.isPositive = interest;
      
      await interestRepo.Save(interestObj);
    
      const reverseInterest = await interestRepo.findOne({
        where: {
          agent: subject,
          subject: agent,
          isPositive: true
        }
      });
    
      if (reverseInterest) {
        let chat = new Chat();
        chat.team1 = agent;
        chat.team2 = subject;
        chat.status = ChatStatus.active;
        const chatRepo = getCustomRepository(ChatRepo);
        chat = await chatRepo.Save(chat) as Chat;

        //agent
        const onlineUsers = cache.get("onlineUsers") as Set<string>;
        const isSubjectOnline = onlineUsers.has(subject.id);

        let subjectMatchData: ITeam = {
          id: subject.id,
          logo: subject.logoURL || undefined,
          messages: [],
          name: subject.user.name,
          status: "inactive",
          chatId: chat.id,
          connected: isSubjectOnline,
          lastSeen: new Date(subject.lastSeen)
        };

        socket.emit("user/match", subjectMatchData);

        //subject
        const isAgentOnline = onlineUsers.has(agent.id);

        let agentMatchData: ITeam = {
          id: agent.id,
          logo: agent.logoURL || undefined,
          messages: [],
          name: agent.user.name,
          status: "inactive",
          chatId: chat.id,
          connected: isAgentOnline,
          lastSeen: new Date(agent.lastSeen)
        };

        return socket.to(id).emit("user/match", agentMatchData);
      }

      const courseRepo = getCustomRepository(CourseRepo);
      
      const course = await courseRepo.createQueryBuilder("course")
        .innerJoin("course.teams", "team")
        .where("course.id = team.course_id")
        .andWhere("team.id = :id", { id: agent.id })
        .getOne()
      ;
      
      if (interest) {
        return socket.to(id).emit("user/interest", {
          id: agent.id,
          name: agent.user.name,
          logo: agent.logoURL,
          course: course?.name,
          isMine: false
        });
      }
    }
  })
}
