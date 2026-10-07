import "dotenv/config";
import { CONSTANTS } from "./constants";
import { openApplicationDatabase } from "../db/connection";

export type ApplicationDatabase = ReturnType<typeof openApplicationDatabase>;

let database: ApplicationDatabase | undefined;

/** Open the default connection only when an operation actually needs it. */
export function getDatabase(): ApplicationDatabase {
  return database ??= openApplicationDatabase({
    contentPath: CONSTANTS.CONTENT_DATABASE_URL,
    usersPath: CONSTANTS.USERS_DATABASE_URL,
  });
}

export function closeDatabase(): void {
  if (database?.$client.isOpen) database.$client.close();
  database = undefined;
}
