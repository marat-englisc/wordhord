import { InlineKeyboard, type Bot } from "grammy";
import { getOrCreateUser, updateUser } from "../db/repositories/user/userRepository";
import { createStudyService, StudyError, type StudyService } from "../core/fsrs";
import { getAdminTelegramIds, getStudyTimeZone } from "../config/admin";
import { adminCallback, adminMessage, adminHome } from "./admin/handlers";
import { home, help, deckList, rulesList, startStudy, statistics, learningCallback, learningMessage } from "./learning";
import { clearFlow, UserInputError, type BotContext, type BotState } from "./types";
import { escapeHtml, homeButton, short } from "./ui";

export interface HandlerOptions {
  adminIds?: ReadonlySet<number>;
  timeZone?: string;
  study?: StudyService;
  sessionTtlMs?: number;
}

export function registerHandlers(bot: Bot<BotContext>, options: HandlerOptions = {}): void {
  const adminIds = options.adminIds ?? getAdminTelegramIds();
  const timeZone = getStudyTimeZone(options.timeZone);
  const study = options.study ?? createStudyService({ policy: { timeZone } });
  const ttl = options.sessionTtlMs ?? 2 * 60 * 60 * 1000;
  const sessions = new Map<number, BotState>();
  const locks = new Map<number, Promise<void>>();
  let lastCleanup = 0;

  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.chat?.type !== "private") {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: "Открой личный чат с ботом." });
      else if (ctx.message?.text?.startsWith("/")) await ctx.reply("Для обучения открой личный чат с ботом.");
      return;
    }
    const telegramId = ctx.from.id;
    const previous = locks.get(telegramId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => gate);
    locks.set(telegramId, queued);
    // Acknowledge before queued work/downloads, so Telegram's spinner stays short.
    if (ctx.callbackQuery) {
      try { await ctx.answerCallbackQuery(); }
      catch { /* Expired callback queries can still safely recover through /menu. */ }
    }
    await previous;
    try {
      const now = Date.now();
      if (now - lastCleanup > 60_000) {
        for (const [id, session] of sessions) if (now - session.touchedAt > ttl) sessions.delete(id);
        lastCleanup = now;
      }
      let state = sessions.get(telegramId);
      if (!state || now - state.touchedAt > ttl) state = { touchedAt: now };
      state.touchedAt = now;
      sessions.delete(telegramId);
      sessions.set(telegramId, state);
      if (sessions.size > 10_000) sessions.delete(sessions.keys().next().value!);
      const result = await getOrCreateUser({ telegramId, username: ctx.from.username ?? null,
        firstName: ctx.from.first_name, lastName: ctx.from.last_name ?? null });
      let user = result.user;
      const profile = { username: ctx.from.username ?? null, firstName: ctx.from.first_name, lastName: ctx.from.last_name ?? null };
      if (user.username !== profile.username || user.firstName !== profile.firstName || user.lastName !== profile.lastName) {
        user = await updateUser(user.id, profile) ?? user;
      }
      // Environment grants are evaluated here, not persisted as irrevocable privileges.
      ctx.app = { user: { ...user, isAdmin: user.isAdmin || adminIds.has(telegramId) }, state, study, timeZone };
      await next();
    } catch (error) {
      let message: string;
      let keyboard = homeButton();
      if (error instanceof UserInputError) message = error.message;
      else if (error instanceof StudyError) {
        if (ctx.app) clearFlow(ctx.app.state);
        const messages: Record<StudyError["code"], string> = {
          USER_NOT_FOUND: "Аккаунт не найден. Нажми /start.",
          CARD_NOT_AVAILABLE: "Колода или карточка больше недоступна. Выбери другую колоду.",
          STALE_CARD: "Этот ответ уже сохранён или карточка изменилась. Продолжи обучение с новой карточки.",
          CARD_NOT_DUE: "Эту карточку пока рано повторять. Бот подберёт следующую.",
          DAILY_LIMIT: "Дневной лимит достигнут. Можно читать грамматику или вернуться позже.",
          INVALID_PROGRESS: "Не удалось прочитать прогресс карточки. Администратору нужно проверить данные.",
        };
        message = messages[error.code];
        keyboard = homeButton(new InlineKeyboard().text("Продолжить обучение", "study:0"));
      } else if (/constraint|foreign key|unique/i.test(error instanceof Error ? error.message : "")) {
        message = "Не удалось сохранить: связанная запись удалена, такая связь уже есть или остались вложенные записи. Проверь данные и попробуй снова.";
      } else {
        console.error(`Handler failed for update ${ctx.update.update_id}:`, error instanceof Error ? error.name : "Unknown error");
        message = "Не удалось выполнить действие. Попробуй ещё раз или открой /menu.";
      }
      await ctx.reply(escapeHtml(message), { parse_mode: "HTML", reply_markup: keyboard });
    } finally {
      release();
      if (locks.get(telegramId) === queued) locks.delete(telegramId);
    }
  });

  bot.command("start", async (ctx) => home(ctx, `Привет, ${escapeHtml(short(ctx.from!.first_name, 80))}! Выбери, чем займёмся сегодня.`));
  bot.command("menu", async (ctx) => home(ctx));
  bot.command("help", help);
  bot.command("decks", async (ctx) => { delete ctx.app.state.query; await deckList(ctx, "all", 0); });
  bot.command("grammar", async (ctx) => { delete ctx.app.state.query; await rulesList(ctx); });
  bot.command("study", async (ctx) => startStudy(ctx));
  bot.command("stats", statistics);
  bot.command("cancel", async (ctx) => home(ctx));
  bot.command("id", async (ctx) => { await ctx.reply(`Твой Telegram ID: ${ctx.from!.id}`); });
  bot.command("admin", async (ctx) => {
    if (!ctx.app.user.isAdmin) throw new UserInputError("Мастерская доступна только администраторам.");
    await adminHome(ctx);
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data === "admin" || data.startsWith("a:") || data.startsWith("af:")) await adminCallback(ctx, data);
    else await learningCallback(ctx, data);
  });
  bot.on("message", async (ctx) => {
    if (/^\/[a-zA-Z0-9_]+(?:@[a-zA-Z0-9_]+)?(?:\s|$)/.test(ctx.message.text ?? "")) {
      await ctx.reply("Неизвестная команда. /menu — главное меню, /cancel — отменить ввод.");
      return;
    }
    if (ctx.app.state.form) { await adminMessage(ctx); return; }
    if (await learningMessage(ctx)) return;
    await ctx.reply("Выбери действие в меню. /menu — колоды, грамматика и обучение.", { reply_markup: homeButton() });
  });
}

export async function configureBotCommands(bot: Bot<BotContext>, signal?: Parameters<Bot<BotContext>["init"]>[0]): Promise<void> {
  await bot.api.setMyCommands([
    { command: "menu", description: "🌿 Главное меню" },
    { command: "study", description: "▶️ Повторить слова" },
    { command: "decks", description: "🗂 Учебные колоды" },
    { command: "grammar", description: "📖 Грамматика" },
    { command: "stats", description: "📊 Мой прогресс" },
    { command: "cancel", description: "Отменить ввод / завершить тренировку" },
    { command: "help", description: "Как учиться" },
    { command: "id", description: "Мой Telegram ID" },
  ], {}, signal);
}
