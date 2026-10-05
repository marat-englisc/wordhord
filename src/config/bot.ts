import { Bot } from "grammy";
import "dotenv/config";
import { CONSTANTS } from "./constants";

export const bot = new Bot(CONSTANTS.TELEGRAM_TOKEN);
