import { randomBytes } from "node:crypto";
import { InlineKeyboard } from "grammy";
import { Rating, State, type Grade } from "ts-fsrs";
import { getDeckById, getDecks, countDecks } from "../db/repositories/card/deckRepository";
import { getCards, countCards, getCardDetails } from "../db/repositories/card/cardRepository";
import { getDecksForUser, countUserDecks, getUserDeckByUserAndDeck, getOrCreateUserDeck, deleteUserDeckByUserAndDeck } from "../db/repositories/user/userDeckRepository";
import { getUserCardMeaningStatistics } from "../db/repositories/user/userCardMeaningRepository";
import { getRules, countRules, getRuleDetails } from "../db/repositories/grammar/ruleRepository";
import { countUserRules, getUserRuleByUserAndRule, getOrCreateUserRule, deleteUserRuleByUserAndRule } from "../db/repositories/user/userRuleRepository";
import { getUserRuleCommentByUserAndRule, saveUserRuleComment, deleteUserRuleCommentByUserAndRule } from "../db/repositories/user/userRuleCommentRepository";
import { audioInput } from "./audio";
import { clearFlow, UserInputError, type BotContext } from "./types";
import { escapeHtml as e, dateLabel, homeButton, intervalLabel, PAGE_SIZE, pager, pages, paragraphs, screen, short } from "./ui";

export async function home(ctx: BotContext, greeting?: string): Promise<void> {
  clearFlow(ctx.app.state);
  const keyboard = new InlineKeyboard().text("🗂 Учебные колоды", "decks:all:0").row()
    .text("▶️ Повторить слова", "study:0").text("📚 Мои колоды", "decks:mine:0").row()
    .text("📖 Грамматика", "rules:0").text("📊 Мой прогресс", "stats").row();
  if (ctx.app.user.isAdmin) keyboard.text("⚙️ Мастерская", "admin").row();
  keyboard.text("Как учиться", "help");
  await screen(ctx, `<b>🌿 Wordhord${ctx.app.user.isAdmin ? " · Администратор" : ""}</b>\n\n${greeting ?? `Привет, ${e(short(ctx.from?.first_name ?? "друг", 80))}!`}\n\nПополни запас английских слов и разбирайся в грамматике — шаг за шагом.\n\n<b>Слова</b> · Выбери колоду и вспоминай ответы. Бот подберёт время следующего повторения.\n<b>Грамматика</b> · Читай правила, сохраняй заметки и отмечай изученное.`, keyboard);
}

export async function help(ctx: BotContext): Promise<void> {
  clearFlow(ctx.app.state);
  await screen(ctx, "<b>Маленькие шаги, крепкая память 🌿</b>\n\n1. Открой «Учебные колоды» и добавь интересные в свою коллекцию.\n2. Нажми «Тренировать». Вспомни значение слова, затем открой ответ.\n3. Оцени, насколько легко вспомнил:\n\n🔴 <b>Снова</b> — не вспомнил.\n🟠 <b>Трудно</b> — вспомнил с большим усилием.\n🟢 <b>Помню</b> — вспомнил уверенно.\n🔵 <b>Легко</b> — ответ пришёл сразу.\n\nНа кнопках показаны примерные интервалы. После оценки FSRS назначит повторение.\n\nВ грамматике можно читать разделы, смотреть иллюстрации, оставлять личные заметки и отмечать правила изученными.\n\n/menu — главное меню\n/study — повторение всех выбранных колод\n/cancel — отменить ввод или завершить тренировку\n/id — узнать свой Telegram ID", homeButton());
}

function searchText(ctx: BotContext, scope: "decks" | "rules") {
  return ctx.app.state.query?.scope === scope ? ctx.app.state.query.text : undefined;
}

export async function deckList(ctx: BotContext, mode: "all" | "mine", requestedPage: number): Promise<void> {
  clearFlow(ctx.app.state);
  const search = mode === "all" ? searchText(ctx, "decks") : undefined;
  const total = mode === "mine" ? await countUserDecks({ userId: ctx.app.user.id }) : await countDecks({ search });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages - 1);
  const query = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const rows = mode === "mine" ? (await getDecksForUser(ctx.app.user.id, query)).map((r) => r.deck) : await getDecks({ ...query, search });
  const keyboard = new InlineKeyboard();
  for (const deck of rows) {
    const selected = mode === "mine" || !!await getUserDeckByUserAndDeck(ctx.app.user.id, deck.id);
    keyboard.text(`${selected ? "✓ " : ""}${short(deck.name)}`, `deck:${deck.id}`).row();
  }
  pager(keyboard, page, totalPages, (p) => `decks:${mode}:${p}`);
  if (mode === "all") keyboard.text("🔎 Найти колоду", "search:decks").row();
  if (search) keyboard.text("✕ Сбросить поиск", "searchClear:decks").row();
  keyboard.text(mode === "mine" ? "Все колоды" : "Мои колоды", `decks:${mode === "mine" ? "all" : "mine"}:0`);
  await screen(ctx, `<b>${mode === "mine" ? "📚 Мои колоды" : "🗂 Учебные колоды"}</b>\n\n${search ? `Поиск: ${e(short(search, 100))}\n\n` : ""}${total ? "Выбери колоду, чтобы посмотреть слова и начать тренировку.\n✓ — уже в твоей коллекции." : mode === "mine" ? "Пока нет выбранных колод. Найди свою первую в каталоге." : search ? "По этому запросу колод нет." : "Колоды скоро появятся. Загляни сюда позже."}`, homeButton(keyboard));
}

export async function deckScreen(ctx: BotContext, id: number): Promise<void> {
  clearFlow(ctx.app.state);
  const deck = await getDeckById(id);
  if (!deck) throw new UserInputError("Эта колода удалена.");
  const count = await countCards({ deckId: id });
  const selected = await getUserDeckByUserAndDeck(ctx.app.user.id, id);
  const keyboard = new InlineKeyboard();
  let status = "Добавь колоду в коллекцию, чтобы начать обучение.";
  if (selected) {
    const queue = await ctx.app.study.getStudyQueue(ctx.app.user.id, { deckId: id, limit: 1 });
    status = `✓ В твоей коллекции\nГотово к повторению: ${queue.counts.dueReview + queue.counts.dueLearning}`;
    keyboard.text("▶️ Тренировать", `study:${id}`).row();
    if (!queue.items.length && queue.nextDueAt) status += `\nБлижайшее повторение: ${dateLabel(queue.nextDueAt, ctx.app.timeZone)}`;
  } else keyboard.text("＋ Добавить в мои колоды", `join:${id}`).row();
  keyboard.text("Посмотреть слова", `words:${id}:0`).row();
  if (selected) keyboard.text("Убрать из коллекции", `leave:${id}`).row();
  keyboard.text("‹ Колоды", "decks:all:0");
  await screen(ctx, `<b>🗂 ${e(short(deck.name, 160))}</b>\n\nСлов: ${count}\n\n${status}`, homeButton(keyboard));
}

async function words(ctx: BotContext, deckId: number, requestedPage: number): Promise<void> {
  clearFlow(ctx.app.state);
  const deck = await getDeckById(deckId);
  if (!deck) throw new UserInputError("Колода удалена.");
  const total = await countCards({ deckId });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages - 1);
  const keyboard = new InlineKeyboard();
  for (const card of await getCards({ deckId, limit: PAGE_SIZE, offset: page * PAGE_SIZE })) keyboard.text(short(card.title), `word:${card.id}:0`).row();
  pager(keyboard, page, totalPages, (p) => `words:${deckId}:${p}`);
  keyboard.text("‹ К колоде", `deck:${deckId}`);
  await screen(ctx, `<b>${e(short(deck.name, 160))}</b>\n\n${total ? "Словарь колоды · выбери слово." : "В этой колоде пока нет слов."}`, homeButton(keyboard));
}

function meaningBlocks(meaning: NonNullable<Awaited<ReturnType<typeof getCardDetails>>>["meanings"][number]): string[] {
  const blocks = [...paragraphs(meaning.meaningTranslation).map((p) => `<b>${p}</b>`), ...paragraphs(meaning.meaning)];
  for (const link of meaning.attributes) blocks.push(`<b>${e(short(link.attribute.name, 160))}</b>`, ...paragraphs(link.value));
  for (const example of meaning.examples) blocks.push(...paragraphs(example.example).map((p) => `<i>${p}</i>`), ...paragraphs(example.exampleTranslation));
  return blocks;
}

async function word(ctx: BotContext, id: number, requestedPage: number): Promise<void> {
  clearFlow(ctx.app.state);
  const card = await getCardDetails(id);
  if (!card) throw new UserInputError("Слово удалено.");
  const content = pages([`<b>${e(short(card.title, 160))}</b>${card.transcription ? `\n${e(short(card.transcription, 160))}` : ""}`, ...card.meanings.flatMap(meaningBlocks)]);
  const page = Math.min(requestedPage, content.length - 1);
  const keyboard = new InlineKeyboard();
  pager(keyboard, page, content.length, (p) => `word:${id}:${p}`);
  if (card.audioUrl) keyboard.text("🔊 Произношение", `audio:${id}`).row();
  keyboard.text("‹ Слова колоды", `words:${card.deckId}:0`);
  await screen(ctx, content[page]!, homeButton(keyboard));
}

const reasons = { new: "Новое слово", learning: "Закрепление", relearning: "Восстановление", overdue: "Пора освежить", due_today: "Повторение" };
export async function startStudy(ctx: BotContext, deckId?: number, answered = 0): Promise<void> {
  clearFlow(ctx.app.state);
  const queue = await ctx.app.study.getStudyQueue(ctx.app.user.id, { deckId, limit: 1 });
  const item = queue.items[0];
  if (!item) {
    const selectedCount = await countUserDecks({ userId: ctx.app.user.id });
    const cardCount = deckId ? await countCards({ deckId }) : null;
    const limited = queue.counts.newRemaining === 0 || queue.counts.reviewRemaining === 0;
    let text = "<b>🌿 На сейчас всё!</b>";
    if (!selectedCount) text = "<b>Выбери первую колоду 🗂</b>\n\nДобавь колоду в коллекцию, чтобы начать тренировку.";
    else if (cardCount === 0) text += "\n\nВ этой колоде пока нет слов.";
    else {
      text += `\n\nОтветов за эту тренировку: ${answered}.\nОтветов сегодня: ${queue.counts.answersToday}.`;
      text += limited ? "\nДостигнут дневной лимит или новые слова временно ограничены из-за накопившихся повторений. Повтори другие колоды или вернись позже." : "\nВсе доступные карточки разобраны. Хорошая работа.";
      if (queue.nextDueAt) text += `\n\nБлижайшее повторение: <b>${dateLabel(queue.nextDueAt, ctx.app.timeZone)}</b>.`;
      text += `\nВремя указано для ${e(ctx.app.timeZone)}.`;
    }
    const keyboard = new InlineKeyboard().text("↻ Проверить ещё раз", `study:${deckId ?? 0}`).row().text("🗂 Выбрать колоды", "decks:all:0");
    if (deckId) keyboard.row().text("Повторить все колоды", "study:0");
    await screen(ctx, text, homeButton(keyboard));
    return;
  }
  const token = randomBytes(6).toString("hex");
  const study = { item, token, revealed: false, deckId, answered, messageId: undefined as number | undefined };
  ctx.app.state.study = study;
  const keyboard = new InlineKeyboard().text("Показать ответ", `reveal:${token}:0`).row();
  if (item.card.audioUrl) keyboard.text("🔊 Послушать", `saudio:${token}`).row();
  keyboard.text("Завершить тренировку", "finish");
  study.messageId = await screen(ctx, `<b>${e(short(item.deck.name, 100))}</b> · ${reasons[item.reason]}\n\n<b>${e(short(item.card.title, 100))}</b>${item.card.transcription ? `\n${e(short(item.card.transcription, 100))}` : ""}${item.meaning.hint ? `\n\n💡 ${e(short(item.meaning.hint, 220))}` : ""}\n\nВспомни значение, затем открой ответ.\n\nОтветов за тренировку: ${answered}`, keyboard);
}

function activeStudy(ctx: BotContext, token: string) {
  const study = ctx.app.state.study;
  if (!study || token !== study.token || ctx.callbackQuery?.message?.message_id !== study.messageId) throw new UserInputError("Эта карточка уже закрыта. Начни тренировку заново.");
  return study;
}

async function reveal(ctx: BotContext, token: string, requestedPage: number): Promise<void> {
  const study = activeStudy(ctx, token);
  const preview = await ctx.app.study.previewCardReview(ctx.app.user.id, { cardMeaningId: study.item.meaning.id, version: study.item.version });
  const card = await getCardDetails(study.item.card.id);
  const meaning = card?.meanings.find((m) => m.id === study.item.meaning.id);
  if (!card || !meaning) throw new UserInputError("Материалы этой карточки удалены. Начни тренировку заново.");
  const content = pages([`<b>${e(short(card.title, 160))}</b>${card.transcription ? `\n${e(short(card.transcription, 160))}` : ""}`, ...meaningBlocks(meaning)]);
  const page = Math.min(requestedPage, content.length - 1);
  const keyboard = new InlineKeyboard();
  pager(keyboard, page, content.length, (p) => `reveal:${token}:${p}`);
  const grades: [Grade, string][] = [[Rating.Again, "🔴 Снова"], [Rating.Hard, "🟠 Трудно"], [Rating.Good, "🟢 Помню"], [Rating.Easy, "🔵 Легко"]];
  grades.forEach(([grade, label], index) => {
    keyboard.text(`${label} · ${intervalLabel(preview.outcomes[grade].progress.due)}`, `rate:${token}:${grade}`);
    if (index % 2 === 1) keyboard.row();
  });
  if (card.audioUrl) keyboard.text("🔊 Послушать", `saudio:${token}`).row();
  keyboard.text("Завершить тренировку", "finish");
  study.messageId = await screen(ctx, `${content[page]}\n\n<b>Насколько легко вспомнил?</b>`, keyboard);
  study.revealed = true;
}

async function sendAudio(ctx: BotContext, cardId: number): Promise<void> {
  const card = await getCardDetails(cardId);
  if (!card?.audioUrl) throw new UserInputError("Произношение пока не добавлено.");
  try {
    const input = await audioInput(card.audioUrl);
    if (/\.(ogg|oga)$/i.test(card.audioUrl)) {
      try { await ctx.replyWithVoice(input, { caption: `🔊 ${short(card.title, 160)}` }); }
      catch { await ctx.replyWithDocument(await audioInput(card.audioUrl), { caption: `🔊 ${short(card.title, 160)}` }); }
    }
    else if (/\.(wav|flac)$/i.test(card.audioUrl)) await ctx.replyWithDocument(input, { caption: `🔊 ${short(card.title, 160)}` });
    else await ctx.replyWithAudio(input, { title: short(card.title, 160) });
  } catch { throw new UserInputError("Аудио сейчас недоступно. Продолжай обучение — администратор сможет заменить файл."); }
}

export async function rulesList(ctx: BotContext, requestedPage = 0): Promise<void> {
  clearFlow(ctx.app.state);
  const search = searchText(ctx, "rules");
  const total = await countRules({ search });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages - 1);
  const keyboard = new InlineKeyboard();
  for (const rule of await getRules({ search, limit: PAGE_SIZE, offset: page * PAGE_SIZE })) {
    const learned = !!await getUserRuleByUserAndRule(ctx.app.user.id, rule.id);
    keyboard.text(`${learned ? "✓ " : ""}${short(rule.name)}`, `rule:${rule.id}:0`).row();
  }
  pager(keyboard, page, totalPages, (p) => `rules:${p}`);
  keyboard.text("🔎 Найти правило", "search:rules").row();
  if (search) keyboard.text("✕ Сбросить поиск", "searchClear:rules").row();
  await screen(ctx, `<b>📖 Грамматика</b>\n\n${search ? `Поиск: ${e(short(search, 100))}\n\n` : ""}${total ? "Выбери тему.\n✓ — отмечено как изученное." : search ? "Правил по этому запросу нет." : "Правила скоро появятся. Загляни сюда позже."}`, homeButton(keyboard));
}

export async function ruleScreen(ctx: BotContext, id: number, requestedPage = 0): Promise<void> {
  clearFlow(ctx.app.state);
  const rule = await getRuleDetails(id);
  if (!rule) throw new UserInputError("Это правило удалено.");
  const learned = !!await getUserRuleByUserAndRule(ctx.app.user.id, id);
  const note = await getUserRuleCommentByUserAndRule(ctx.app.user.id, id);
  const blocks = [`<b>📖 ${e(short(rule.name, 160))}</b>`];
  for (const section of rule.sections) {
    blocks.push(`<b>${e(short(section.title, 160))}</b>`, ...paragraphs(section.content));
    for (const info of section.primaryInfos) blocks.push(...paragraphs(info.content).map((p) => `💡 ${p}`));
    for (const example of section.examples) blocks.push(...paragraphs(example.example).map((p) => `<i>${p}</i>`), ...paragraphs(example.exampleTranslation));
  }
  if (!rule.sections.length) blocks.push("Материалы этого правила пока готовятся.");
  const content = pages(blocks);
  const page = Math.min(requestedPage, content.length - 1);
  const keyboard = new InlineKeyboard();
  pager(keyboard, page, content.length, (p) => `rule:${id}:${p}`);
  if (rule.images.length) keyboard.text(`🖼 Иллюстрации · ${rule.images.length}`, `image:${id}:0`).row();
  keyboard.text(learned ? "✓ Изучено · снять отметку" : "✓ Отметить изученным", `learned:${id}:${learned ? 0 : 1}`).row();
  keyboard.text(note ? "📝 Моя заметка" : "＋ Добавить заметку", `note:${id}`).row();
  keyboard.text("‹ Все правила", "rules:0");
  await screen(ctx, content[page]!, homeButton(keyboard));
}

async function noteScreen(ctx: BotContext, id: number, requestedPage = 0): Promise<void> {
  clearFlow(ctx.app.state);
  if (!await getRuleDetails(id)) throw new UserInputError("Правило удалено.");
  const note = await getUserRuleCommentByUserAndRule(ctx.app.user.id, id);
  const content = pages(["<b>📝 Личная заметка</b>", ...(note ? paragraphs(note.comment) : ["Запиши здесь свою подсказку или пример. Заметку видишь только ты."])]);
  const page = Math.min(requestedPage, content.length - 1);
  const keyboard = new InlineKeyboard();
  pager(keyboard, page, content.length, (p) => `note:${id}:${p}`);
  keyboard.text(note ? "✏️ Изменить заметку" : "＋ Написать заметку", `noteEdit:${id}`).row();
  if (note) keyboard.text("🗑 Удалить мою заметку", `noteDelete:${id}`).row();
  keyboard.text("‹ К правилу", `rule:${id}:0`);
  await screen(ctx, content[page]!, homeButton(keyboard));
}

export async function statistics(ctx: BotContext): Promise<void> {
  clearFlow(ctx.app.state);
  const queue = await ctx.app.study.getStudyQueue(ctx.app.user.id, { limit: 0 });
  const stats = await getUserCardMeaningStatistics(ctx.app.user.id);
  const count = (state: State) => stats.find((s) => s.state === state)?.total ?? 0;
  const decks = await countUserDecks({ userId: ctx.app.user.id });
  const rules = await countUserRules({ userId: ctx.app.user.id });
  await screen(ctx, `<b>📊 Твой прогресс</b>\n\n<b>Сегодня</b>\nОтветов: ${queue.counts.answersToday}\nНовых значений: ${queue.counts.introducedToday}\nПовторённых значений: ${queue.counts.reviewedToday}\n\n<b>Словарный запас</b>\nНа закреплении: ${count(State.Learning)}\nНа повторении: ${count(State.Review)}\nНа восстановлении: ${count(State.Relearning)}\nГотово к повторению: ${queue.counts.dueReview + queue.counts.dueLearning}\n\nВыбранных колод: ${decks}\nИзученных правил: ${rules}\n\nДоступно новых сегодня: ${queue.counts.newRemaining}\nОсталось обычных повторений: ${queue.counts.reviewRemaining}\n\nДень обучения: ${queue.day.key} (${e(ctx.app.timeZone)}).`, homeButton(new InlineKeyboard().text("▶️ Продолжить обучение", "study:0")));
}

function num(value: string | undefined, zero = false): number {
  if (!value || !/^\d+$/.test(value)) throw new UserInputError("Неизвестная кнопка. Открой /menu.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1) || (zero && n > 1_000_000)) throw new UserInputError("Некорректная кнопка.");
  return n;
}

export async function learningCallback(ctx: BotContext, data: string): Promise<void> {
  if (data === "home" || data === "cancel") return home(ctx);
  if (data === "help") return help(ctx);
  if (data === "stats") return statistics(ctx);
  if (data === "noop") return;
  if (data === "finish") {
    const count = ctx.app.state.study?.answered ?? 0;
    clearFlow(ctx.app.state);
    await screen(ctx, `<b>🌿 Тренировка завершена</b>\n\nОтветов за тренировку: ${count}.\nПрогресс сохранён. Возвращайся, когда будет удобно.`, homeButton(new InlineKeyboard().text("▶️ Продолжить", "study:0")));
    return;
  }
  const [action, a, b] = data.split(":");
  if (action === "search" || action === "searchClear") {
    if (a !== "decks" && a !== "rules") throw new UserInputError("Неизвестный поиск.");
    clearFlow(ctx.app.state);
    if (action === "searchClear") {
      delete ctx.app.state.query;
      return a === "decks" ? deckList(ctx, "all", 0) : rulesList(ctx);
    }
    ctx.app.state.search = { scope: a };
    await screen(ctx, `Пришли название ${a === "decks" ? "колоды" : "правила"} или его часть.`, new InlineKeyboard().text("Отмена", "cancel"));
    return;
  }
  if (action === "decks" && (a === "all" || a === "mine")) return deckList(ctx, a, num(b, true));
  if (action === "deck") return deckScreen(ctx, num(a));
  if (action === "words") return words(ctx, num(a), num(b, true));
  if (action === "word") return word(ctx, num(a), num(b, true));
  if (action === "audio") return sendAudio(ctx, num(a));
  if (action === "join") {
    const id = num(a);
    if (!await getDeckById(id)) throw new UserInputError("Колода удалена.");
    await getOrCreateUserDeck({ userId: ctx.app.user.id, deckId: id });
    return deckScreen(ctx, id);
  }
  if (action === "leave") {
    const id = num(a);
    clearFlow(ctx.app.state);
    await deleteUserDeckByUserAndDeck(ctx.app.user.id, id);
    await screen(ctx, "<b>Колода убрана из коллекции</b>\n\nПрогресс сохранён. Если добавишь её снова, продолжишь с прежнего места.", homeButton(new InlineKeyboard().text("‹ Мои колоды", "decks:mine:0")));
    return;
  }
  if (action === "study") return startStudy(ctx, num(a, true) || undefined);
  if (action === "reveal") return reveal(ctx, a!, num(b, true));
  if (action === "saudio") return sendAudio(ctx, activeStudy(ctx, a!).item.card.id);
  if (action === "rate") {
    const study = activeStudy(ctx, a!);
    if (!study.revealed) throw new UserInputError("Сначала открой ответ.");
    const grade = num(b);
    if (grade > 4) throw new UserInputError("Неизвестная оценка.");
    await ctx.app.study.reviewCard(ctx.app.user.id, { cardMeaningId: study.item.meaning.id, version: study.item.version, rating: grade as Grade });
    // Consume the session before any Telegram call, so a retry cannot grade twice.
    delete ctx.app.state.study;
    return startStudy(ctx, study.deckId, study.answered + 1);
  }
  if (action === "rules") return rulesList(ctx, num(a, true));
  if (action === "rule") return ruleScreen(ctx, num(a), num(b, true));
  if (action === "learned") {
    const id = num(a);
    if (!await getRuleDetails(id)) throw new UserInputError("Правило удалено.");
    if (b === "1") await getOrCreateUserRule({ userId: ctx.app.user.id, ruleId: id });
    else if (b === "0") await deleteUserRuleByUserAndRule(ctx.app.user.id, id);
    else throw new UserInputError("Некорректная отметка.");
    return ruleScreen(ctx, id);
  }
  if (action === "note") return noteScreen(ctx, num(a), num(b ?? "0", true));
  if (action === "noteEdit") {
    const id = num(a);
    if (!await getRuleDetails(id)) throw new UserInputError("Правило удалено.");
    clearFlow(ctx.app.state);
    ctx.app.state.note = { ruleId: id };
    await screen(ctx, "<b>📝 Твоя заметка</b>\n\nПришли текст до 2000 символов. Он заменит текущую заметку.", new InlineKeyboard().text("Отмена", `note:${id}`));
    return;
  }
  if (action === "noteDelete") {
    const id = num(a);
    await deleteUserRuleCommentByUserAndRule(ctx.app.user.id, id);
    return noteScreen(ctx, id);
  }
  if (action === "image") {
    const id = num(a);
    const index = num(b, true);
    const rule = await getRuleDetails(id);
    const image = rule?.images[index];
    if (!image) throw new UserInputError("Иллюстрация недоступна.");
    const keyboard = new InlineKeyboard();
    if (index + 1 < rule!.images.length) keyboard.text("Следующая иллюстрация ›", `image:${id}:${index + 1}`).row();
    keyboard.text("‹ К правилу", `rule:${id}:0`);
    try { await ctx.replyWithPhoto(image.imageUrl, { caption: `${short(rule!.name, 160)} · ${index + 1}/${rule!.images.length}`, reply_markup: keyboard }); }
    catch { throw new UserInputError("Не удалось показать иллюстрацию. Администратор сможет заменить её."); }
    return;
  }
  throw new UserInputError("Эта кнопка больше не работает. Открой /menu.");
}

export async function learningMessage(ctx: BotContext): Promise<boolean> {
  const { state, user } = ctx.app;
  if (state.note) {
    const text = ctx.message?.text?.trim();
    if (!text || Array.from(text).length > 2000) throw new UserInputError("Пришли текст заметки: от 1 до 2000 символов.");
    const id = state.note.ruleId;
    if (!await getRuleDetails(id)) throw new UserInputError("Правило удалено.");
    await saveUserRuleComment(user.id, id, text);
    delete state.note;
    await noteScreen(ctx, id);
    return true;
  }
  if (state.search) {
    const text = ctx.message?.text?.trim();
    if (!text || Array.from(text).length > 100) throw new UserInputError("Пришли поисковый запрос от 1 до 100 символов.");
    const scope = state.search.scope;
    state.query = { scope, text };
    delete state.search;
    if (scope === "decks") await deckList(ctx, "all", 0); else await rulesList(ctx);
    return true;
  }
  return false;
}
