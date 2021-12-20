import { ConnectionOptions } from "typeorm"

const prodOptions: Partial<ConnectionOptions> = {
  entities: [ "build/models/**/*.js" ],
  cli: { 
    entitiesDir: "build/models",
  }
};
export default prodOptions