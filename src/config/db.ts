import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { CONSTANTS } from "./constants";

export const db = drizzle(CONSTANTS.DATABASE_URL);
