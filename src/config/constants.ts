import "dotenv/config";

export const CONSTANTS = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN!,
  CONTENT_DATABASE_URL: process.env.CONTENT_DATABASE_URL ?? "./content.db",
  USERS_DATABASE_URL: process.env.USERS_DATABASE_URL ?? "./users.db",
};
