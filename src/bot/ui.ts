import { GrammyError, InlineKeyboard, type Context } from "grammy";

export const PAGE_SIZE = 8;
export const escapeHtml = (value: unknown): string => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const short = (value: unknown, length = 52): string => {
  const chars = Array.from(String(value ?? ""));
  return chars.length > length ? chars.slice(0, length - 1).join("") + "…" : chars.join("");
};

/** Each fragment is complete HTML; neither entities nor surrogate pairs are cut. */
export function paragraphs(value: string): string[] {
  const result: string[] = [];
  let chunk = "";
  for (const char of value) {
    const escaped = escapeHtml(char);
    if (chunk.length + escaped.length > 2800) { result.push(chunk); chunk = ""; }
    chunk += escaped;
  }
  if (chunk) result.push(chunk);
  return result;
}

export function pages(blocks: string[]): string[] {
  const result: string[] = [];
  let page = "";
  for (const block of blocks.filter(Boolean)) {
    if (page && page.length + block.length + 2 > 3500) { result.push(page); page = ""; }
    page += (page ? "\n\n" : "") + block;
  }
  if (page) result.push(page);
  return result.length ? result : ["Материалы пока не добавлены."];
}

export function pager(keyboard: InlineKeyboard, page: number, total: number, route: (page: number) => string) {
  if (total > 1) {
    if (page > 0) keyboard.text("‹ Назад", route(page - 1));
    keyboard.text(`${page + 1} / ${total}`, "noop");
    if (page + 1 < total) keyboard.text("Далее ›", route(page + 1));
    keyboard.row();
  }
  return keyboard;
}

export async function screen(ctx: Context, text: string, keyboard: InlineKeyboard): Promise<number> {
  const options = { parse_mode: "HTML" as const, reply_markup: keyboard, link_preview_options: { is_disabled: true } };
  if (ctx.callbackQuery?.message && "text" in ctx.callbackQuery.message) {
    try {
      await ctx.editMessageText(text, options);
      return ctx.callbackQuery.message.message_id;
    } catch (error) {
      if (!(error instanceof GrammyError)) throw error;
      if (error.description.includes("message is not modified")) return ctx.callbackQuery.message.message_id;
      if (!/message to edit not found|message can't be edited/i.test(error.description)) throw error;
    }
  }
  return (await ctx.reply(text, options)).message_id;
}

export const homeButton = (keyboard = new InlineKeyboard()) => keyboard.row().text("⌂ Главное меню", "home");
export const dateLabel = (date: Date, timeZone: string): string => new Intl.DateTimeFormat("ru-RU", {
  timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
}).format(date);

export function intervalLabel(due: Date, now = new Date()): string {
  const minutes = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} мин`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} ч`;
  const days = Math.round(minutes / 1440);
  if (days < 30) return `${days} дн`;
  if (days < 365) return `${Math.round(days / 30)} мес`;
  return `${Math.round(days / 365)} г`;
}
