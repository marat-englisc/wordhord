import type { Bot } from "grammy";
import { getOrCreateUser } from "../db/repositories/user/userRepository";

export function registerHandlers(
  bot: Bot,
  users = { getOrCreateUser },
): void {
  bot.command("start", async (ctx) => {
    if (!ctx.from) return;
    const { created } = await users.getOrCreateUser({
      telegramId: ctx.from.id,
      username: ctx.from.username ?? null,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name ?? null,
      isAdmin: false,
    });
    await ctx.reply(created
      ? `Привет, ${ctx.from.first_name}! Ты зарегистрирован.`
      : `С возвращением, ${ctx.from.first_name}!`);
  });

  bot.on("message", async (ctx) => {
    await ctx.reply("Got another message!");
  });
}
