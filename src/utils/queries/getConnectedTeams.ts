import { Connection, getCustomRepository } from "typeorm";
import Interest from "../../models/interest";
import TeamRepo from "../../repos/team";

export default function getConnectedTeams (id: string, connection: Connection) {
  const interestAgentQuery = connection.createQueryBuilder()
    .select("interest_agent.agent_id")
    .from(Interest, "interest_agent")
    .where("interest_agent.is_positive = true")
    .andWhere("interest_agent.subject_id = :interestAgentSubject", { interestAgentSubject: id })
  ;

  const interestSubjectQuery = connection.createQueryBuilder()
    .select("interest_subject.subject_id")
    .from(Interest, "interest_subject")
    .where("interest_subject.is_positive = true")
    .andWhere("interest_subject.agent_id = :interestSubjectAgent", { interestSubjectAgent: id })
  ;

  const teamRepo = getCustomRepository(TeamRepo);
  const teamsQuery = teamRepo.createQueryBuilder("team")
    .where("team.id in (" + interestAgentQuery.getQuery() + ")")
    .andWhere("team.id in (" + interestSubjectQuery.getQuery() + ")")
    .setParameters(interestAgentQuery.getParameters())
    .setParameters(interestSubjectQuery.getParameters())
  ;

  return teamsQuery;
}