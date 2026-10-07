import { Bot } from "grammy";
import { getTelegramToken } from "./constants";
import type { BotContext } from "../bot/types";

export function createBot(token = getTelegramToken()): Bot<BotContext> {
  return new Bot<BotContext>(token);
}
