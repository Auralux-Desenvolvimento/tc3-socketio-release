import { getCustomRepository } from "typeorm";
import { MiddlewareParam } from "../types/Middleware";
import { verify } from 'jsonwebtoken';
import TeamRepo from "../repos/team";

export interface IAuthPayload {
  id: string,
  moderator: boolean,
  iat: number,
  exp: number
}

const auth: MiddlewareParam = async (socket, next) => {
  let token: undefined|string = socket.handshake.auth.token;
  if (token) {
    const secret = process.env.JWT_SECRET as string;
    let payload: null|IAuthPayload = null;
    try {
      payload = verify(token, secret) as IAuthPayload;
    } catch (err) {
      return next(new Error("Invalid token"));
    }

    const teamRepo = getCustomRepository(TeamRepo);
    const team = await teamRepo.findOne({
      relations: [ "user" ],
      where: { id: payload.id }
    });

    if (!team) {
      return next(new Error("User does not exists"));
    }

    if (!team.isActive) {
      return next(new Error("You are banned"));
    }

    socket.user = team;
    socket.join(team.id);
    next();
  } else {
    next(new Error("Invalid token"));
  }
}
export default auth;