import { bot } from "./config/bot";
import { db } from "./config/db";
import { eq } from "drizzle-orm";
import { userTable } from "./db/schemas/user/user";

bot.command("start", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const telegramId = ctx.from.id;
  const username = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;
  const lastName = ctx.from.last_name || null;

  const existingUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.telegramId, telegramId))
    .limit(1);

  if (existingUser.length > 0) {
    await ctx.reply(`С возвращением, ${firstName}!`);
    return;
  }

  await db.insert(userTable).values({
    telegramId,
    username: username,
    firstName: firstName,
    lastName: lastName,
    isAdmin: false,
  });

  await ctx.reply(`Привет, ${firstName}! Ты зарегистрирован.`);
});

bot.on("message", (ctx) => {
  ctx.reply("Got another message!");
});

bot.start();
