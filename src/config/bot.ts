import { Bot } from "grammy";
import { getTelegramToken } from "./constants";

export function createBot(token = getTelegramToken()): Bot {
  return new Bot(token);
}
