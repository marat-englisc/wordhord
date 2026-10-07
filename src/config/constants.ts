import "dotenv/config";

export const CONSTANTS = {
  CONTENT_DATABASE_URL: process.env.CONTENT_DATABASE_URL ?? "./content.db",
  USERS_DATABASE_URL: process.env.USERS_DATABASE_URL ?? "./users.db",
};

export function getTelegramToken(): string {
  const token = process.env.TELEGRAM_TOKEN?.trim();
  if (!token || token === "your_telegram_bot_token") {
    throw new Error("Set TELEGRAM_TOKEN in .env before starting the bot");
  }
  return token;
}
