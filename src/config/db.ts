import "dotenv/config";
import { drizzle } from "drizzle-orm/node-sqlite";
import { CONSTANTS } from "./constants";

export const db = drizzle(CONSTANTS.DATABASE_URL);

db.$client.exec("PRAGMA foreign_keys = ON");
