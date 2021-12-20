import { EntityRepository, Repository, SaveOptions } from "typeorm";
import Moderator from "../models/moderator";
import detectProfanity from "../utils/detectProfanity";
import handleError from "./utils/handleError";

@EntityRepository(Moderator)
export default class ModeratorRepo extends Repository<Moderator> {
  public async Save (entities: Moderator[]|Moderator, options?: SaveOptions) {
    if (!Array.isArray(entities)) {
      entities = [ entities ];
    }
    try {
      for (const entity of entities) {        
        await entity.validate();
      }
      let savedEntities: Moderator|Moderator[] = await super.save(entities, options);
      if (savedEntities.length === 1) {
        savedEntities = savedEntities[0];
      }
      return savedEntities;
    } catch (error) {
      handleError(error);
    }
  }
}