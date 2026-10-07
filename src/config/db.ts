import "dotenv/config";
import { CONSTANTS } from "./constants";
import { openApplicationDatabase } from "../db/connection";

export const db = openApplicationDatabase({
  contentPath: CONSTANTS.CONTENT_DATABASE_URL,
  usersPath: CONSTANTS.USERS_DATABASE_URL,
});
