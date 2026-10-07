import { randomBytes } from "node:crypto";
import { InlineKeyboard } from "grammy";
import { getCardById, updateCard } from "../../db/repositories/card/cardRepository";
import { getAttributeById, getAttributes, countAttributes } from "../../db/repositories/card/attributeRepository";
import { discardUnusedAudio, saveUploadedAudio } from "../audio";
import { clearFlow, UserInputError, type BotContext } from "../types";
import { escapeHtml as e, homeButton, PAGE_SIZE, pager, paragraphs, pages, screen, short } from "../ui";
import { entities, type EntityKey, type AdminForm } from "./entities";

const nonce = () => randomBytes(6).toString("hex");
function entityKey(value: string): EntityKey {
  if (!Object.hasOwn(entities, value)) throw new UserInputError("Этот раздел больше недоступен.");
  return value as EntityKey;
}
function number(value: string | undefined, allowZero = false): number {
  if (!value || !/^\d+$/.test(value)) throw new UserInputError("Некорректная кнопка. Открой меню заново.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1) || (allowZero && n > 1_000_000)) throw new UserInputError("Некорректная кнопка.");
  return n;
}

export async function adminHome(ctx: BotContext): Promise<void> {
  clearFlow(ctx.app.state);
  await screen(ctx, "<b>⚙️ Мастерская Wordhord</b>\n\nСоздавай учебные материалы и улучшай существующие.\nВыбери раздел:", homeButton(new InlineKeyboard()
    .text("🗂 Колоды и слова", "a:list:deck:0:0").row()
    .text("📖 Правила грамматики", "a:list:rule:0:0").row()
    .text("🏷 Справочник атрибутов", "a:list:attribute:0:0")));
}

async function list(ctx: BotContext, key: EntityKey, parentId: number, requestedPage: number): Promise<void> {
  clearFlow(ctx.app.state);
  const entity = entities[key];
  const filter: Record<string, number> = {};
  let subtitle = "";
  if (entity.parent) {
    const parent = await entities[entity.parent.entity].get(parentId);
    if (!parent) throw new UserInputError("Родительская запись удалена.");
    filter[entity.parent.key] = parentId;
    subtitle = `\n${e(short(parent[entities[entity.parent.entity].labelKey], 100))}`;
  } else if (parentId) throw new UserInputError("Некорректный раздел.");
  const total = await entity.count(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages - 1);
  const rows = await entity.list({ ...filter, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const keyboard = new InlineKeyboard();
  for (const row of rows) keyboard.text(short(row[entity.labelKey]), `a:show:${key}:${row.id}:0`).row();
  pager(keyboard, page, totalPages, (p) => `a:list:${key}:${parentId}:${p}`);
  keyboard.text("＋ Добавить", `a:new:${key}:${parentId}`).row();
  if (entity.parent) keyboard.text("‹ К родительской записи", `a:show:${entity.parent.entity}:${parentId}:0`).row();
  keyboard.text("⚙️ Мастерская", "admin");
  await screen(ctx, `<b>${e(entity.title)}</b>${subtitle}\n\n${total ? `Всего: ${total}. Выбери запись для редактирования.` : "Здесь пока пусто. Добавь первую запись."}`, homeButton(keyboard));
}

async function show(ctx: BotContext, key: EntityKey, id: number, requestedPage = 0): Promise<void> {
  clearFlow(ctx.app.state);
  const entity = entities[key];
  const row = await entity.get(id);
  if (!row) throw new UserInputError("Запись уже удалена.");
  const blocks = [`<b>${e(entity.singular)} · #${id}</b>`];
  for (const field of entity.fields) {
    let value = row[field.key];
    if (field.kind === "attribute") value = (await getAttributeById(Number(value)))?.name ?? "Атрибут удалён";
    blocks.push(`<b>${e(field.label)}</b>`, ...paragraphs(String(value ?? "—")));
  }
  if (key === "card") blocks.push(`🔊 Аудио: ${row.audioUrl ? "прикреплено" : "не добавлено"}`);
  const content = pages(blocks);
  const page = Math.min(requestedPage, content.length - 1);
  const keyboard = new InlineKeyboard();
  pager(keyboard, page, content.length, (p) => `a:show:${key}:${id}:${p}`);
  entity.fields.forEach((field, index) => keyboard.text(`✏️ ${short(field.label, 40)}`, `a:edit:${key}:${id}:${index}`).row());
  for (const child of entity.children ?? []) keyboard.text(`📁 ${entities[child].title}`, `a:list:${child}:${id}:0`).row();
  if (key === "card") keyboard.text("🔊 Загрузить / заменить аудио", `a:audio:card:${id}`).row();
  if (key === "card" && row.audioUrl) keyboard.text("✕ Убрать аудио", `a:audioClear:card:${id}`).row();
  keyboard.text("🗑 Удалить", `a:delete:${key}:${id}`).row();
  keyboard.text("‹ К списку", `a:list:${key}:${entity.parent ? row[entity.parent.key] : 0}:0`);
  await screen(ctx, content[page]!, homeButton(keyboard));
}

async function beginForm(ctx: BotContext, key: EntityKey, id: number | undefined, parentId: number, field = 0, audio = false) {
  clearFlow(ctx.app.state);
  const entity = entities[key];
  if (id && !await entity.get(id)) throw new UserInputError("Запись уже удалена.");
  if (!id && entity.parent && !await entities[entity.parent.entity].get(parentId)) throw new UserInputError("Родительская запись удалена.");
  if (!id && !entity.parent && parentId) throw new UserInputError("Некорректный раздел.");
  if (!audio && !entity.fields[field]) throw new UserInputError("Поле недоступно.");
  const values: Record<string, unknown> = {};
  if (!id && entity.parent) values[entity.parent.key] = parentId;
  ctx.app.state.form = { entity: key, id, parentId, token: nonce(), field, single: !!id, values, audio };
  await prompt(ctx);
}

async function prompt(ctx: BotContext, attributePage = 0): Promise<void> {
  const form = ctx.app.state.form!;
  const entity = entities[form.entity];
  const keyboard = new InlineKeyboard();
  const field = entity.fields[form.field]!;
  let text = `<b>${form.id ? "Редактирование" : "Новая запись"} · ${e(entity.singular)}</b>`;
  if (form.audio) {
    text += "\n\nПришли аудиофайл (MP3, OGG, WAV, M4A, FLAC) или голосовое сообщение, до 20 МБ.\nФайл будет сохранён в папке audio.";
  } else if (form.ready) {
    const blocks = [text, "<b>Проверь данные перед сохранением</b>"];
    for (const f of entity.fields.filter((f) => Object.hasOwn(form.values, f.key))) {
      let value = form.values[f.key];
      if (f.kind === "attribute") value = (await getAttributeById(Number(value)))?.name;
      blocks.push(`${e(f.label)}: ${e(short(value ?? "—", 110))}`);
    }
    text = blocks.join("\n\n");
    keyboard.text("✓ Сохранить", `af:${form.token}:save`).row();
  } else if (form.textDraft !== undefined) {
    text += `\n\n<b>${e(field.label)}</b>\n\nПолучено символов: ${Array.from(form.textDraft).length} / ${field.max}.\nОтправь продолжение следующим сообщением или нажми «Далее».`;
    keyboard.text("Далее ✓", `af:${form.token}:next`).row();
  } else {
    text += `\n\n${form.single ? "" : `Шаг ${form.field + 1} из ${entity.fields.length}\n`}${e(field.label)}`;
    if (field.kind === "attribute") {
      const total = await countAttributes();
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const page = Math.min(attributePage, totalPages - 1);
      for (const item of await getAttributes({ limit: PAGE_SIZE, offset: page * PAGE_SIZE })) keyboard.text(short(item.name), `af:${form.token}:pick:${item.id}`).row();
      pager(keyboard, page, totalPages, (p) => `af:${form.token}:page:${p}`);
      if (!total) text += "\n\nСначала добавь атрибут в справочник мастерской.";
    } else {
      if (form.id) {
        const current = (await entity.get(form.id))?.[field.key];
        text += `\n\nСейчас: ${e(short(current ?? "—", 300))}`;
      }
      text += "\n\nОтправь новое значение сообщением.";
      if (field.kind !== "order" && field.kind !== "image") text += `\nДо ${field.max ?? 3000} символов.${(field.max ?? 0) > 4000 ? " Длинный текст можно отправить несколькими сообщениями, затем нажать «Далее»." : ""}`;
      if (field.optional) keyboard.text("Пропустить / очистить", `af:${form.token}:skip`).row();
    }
  }
  if (form.ready && !form.audio) keyboard.text("✏️ Заполнить заново", `af:${form.token}:restart`).row();
  keyboard.text("Отмена", "cancel");
  await screen(ctx, text, keyboard);
}

async function acceptValue(ctx: BotContext, value: unknown): Promise<void> {
  const form = ctx.app.state.form!;
  const field = entities[form.entity].fields[form.field]!;
  form.values[field.key] = value;
  if (form.single || ++form.field >= entities[form.entity].fields.length) {
    form.field = Math.min(form.field, entities[form.entity].fields.length - 1);
    form.ready = true;
  }
  await prompt(ctx);
}

export async function adminCallback(ctx: BotContext, data: string): Promise<void> {
  if (!ctx.app.user.isAdmin) throw new UserInputError("Мастерская доступна только администраторам.");
  if (data === "admin") return adminHome(ctx);
  const parts = data.split(":");
  if (parts[0] === "af") {
    const form = ctx.app.state.form;
    if (!form || form.token !== parts[1]) throw new UserInputError("Форма устарела. Открой запись заново.");
    if (parts[2] === "page" && !form.ready && entities[form.entity].fields[form.field]?.kind === "attribute") return prompt(ctx, number(parts[3], true));
    if (parts[2] === "pick" && !form.ready && entities[form.entity].fields[form.field]?.kind === "attribute") {
      const id = number(parts[3]);
      if (!await getAttributeById(id)) throw new UserInputError("Атрибут удалён.");
      return acceptValue(ctx, id);
    }
    if (parts[2] === "skip" && !form.ready && entities[form.entity].fields[form.field]?.optional) return acceptValue(ctx, null);
    if (parts[2] === "restart") return beginForm(ctx, form.entity, form.id, form.parentId, form.single ? form.field : 0);
    if (parts[2] === "next" && !form.ready && form.textDraft !== undefined) {
      const text = form.textDraft;
      delete form.textDraft;
      return acceptValue(ctx, text);
    }
    if (parts[2] === "save" && form.ready && !form.audio) {
      const entity = entities[form.entity];
      const result = form.id ? await entity.update(form.id, form.values) : await entity.create(form.values);
      if (!result) throw new UserInputError("Запись удалена другим администратором.");
      delete ctx.app.state.form;
      await show(ctx, form.entity, result.id);
      return;
    }
    throw new UserInputError("Эта кнопка сейчас недоступна.");
  }
  const key = entityKey(parts[2] ?? "");
  const id = number(parts[3], parts[1] === "list" || parts[1] === "new");
  if (parts[1] === "list") return list(ctx, key, id, number(parts[4], true));
  if (parts[1] === "show") return show(ctx, key, id, number(parts[4] ?? "0", true));
  if (parts[1] === "new") return beginForm(ctx, key, undefined, id);
  if (parts[1] === "edit") return beginForm(ctx, key, id, 0, number(parts[4], true));
  if (parts[1] === "audio" && key === "card") return beginForm(ctx, key, id, 0, 0, true);
  if (parts[1] === "audioClear" && key === "card") {
    const card = await getCardById(id);
    if (!card) throw new UserInputError("Слово удалено.");
    await updateCard(id, { audioUrl: null });
    await discardUnusedAudio(card.audioUrl);
    return show(ctx, key, id);
  }
  if (parts[1] === "delete") {
    const row = await entities[key].get(id);
    if (!row) throw new UserInputError("Запись уже удалена.");
    clearFlow(ctx.app.state);
    const token = nonce();
    ctx.app.state.deletion = { entity: key, id, token };
    const consequence = key === "deck" ? "Колоду можно удалить после удаления всех её слов." : key === "card" || key === "meaning" ? "Будут удалены вложенные материалы, прогресс и история обучения этого контента у пользователей." : key === "rule" ? "Будут удалены разделы, иллюстрации, отметки изучения и личные заметки пользователей." : key === "attribute" ? "Атрибут будет удалён из всех значений слов." : "Будут удалены запись и её вложенные материалы.";
    await screen(ctx, `<b>Удалить ${e(entities[key].singular.toLowerCase())}?</b>\n\n${e(short(row[entities[key].labelKey], 200))}\n\n${consequence}\nЭто действие нельзя отменить.`, new InlineKeyboard().text("🗑 Да, удалить", `a:confirm:${key}:${id}:${token}`).row().text("Отмена", `a:show:${key}:${id}:0`));
    return;
  }
  if (parts[1] === "confirm") {
    const deletion = ctx.app.state.deletion;
    if (!deletion || deletion.token !== parts[4] || deletion.id !== id || deletion.entity !== key) throw new UserInputError("Подтверждение устарело.");
    const entity = entities[key];
    const row = await entity.get(id);
    if (!row) throw new UserInputError("Запись уже удалена.");
    if (key === "deck" && await entities.card.count({ deckId: id })) throw new UserInputError("Сначала удали слова из этой колоды. Их прогресс удаляется вместе со словами.");
    await entity.remove(id);
    delete ctx.app.state.deletion;
    return list(ctx, key, entity.parent ? Number(row[entity.parent.key]) : 0, 0);
  }
  throw new UserInputError("Неизвестная кнопка мастерской.");
}

export async function adminMessage(ctx: BotContext): Promise<void> {
  const form = ctx.app.state.form;
  if (!ctx.app.user.isAdmin || !form) throw new UserInputError("Нет активной формы. Открой мастерскую заново.");
  if (form.audio) {
    const card = await getCardById(form.id!);
    if (!card) throw new UserInputError("Слово удалено.");
    const path = await saveUploadedAudio(ctx);
    try {
      if (!await updateCard(card.id, { audioUrl: path })) throw new UserInputError("Слово удалено другим администратором.");
    } catch (error) { await discardUnusedAudio(path); throw error; }
    delete ctx.app.state.form;
    await discardUnusedAudio(card.audioUrl);
    await show(ctx, "card", card.id);
    return;
  }
  if (form.ready) throw new UserInputError("Проверь данные и нажми «Сохранить» или «Заполнить заново».");
  const field = entities[form.entity].fields[form.field]!;
  if (field.kind === "attribute") throw new UserInputError("Выбери атрибут кнопкой под сообщением.");
  let text = ctx.message?.text?.trim();
  if (field.kind === "image" && ctx.message?.photo) text = ctx.message.photo.at(-1)!.file_id;
  if (!text) throw new UserInputError(field.kind === "image" ? "Пришли фото или ссылку на изображение." : "Пришли текстовое сообщение.");
  if (field.kind === "image" && !ctx.message?.photo) {
    try { if (new URL(text).protocol !== "https:") throw new Error(); }
    catch { throw new UserInputError("Нужна HTTPS-ссылка или фото, отправленное в Telegram."); }
  }
  if (field.kind === "order") {
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > 1_000_000) throw new UserInputError("Введи целое число от 0 до 1000000.");
    return acceptValue(ctx, Number(text));
  }
  if (form.textDraft !== undefined) text = `${form.textDraft}\n${text}`;
  if (Array.from(text).length > (field.max ?? 3000)) throw new UserInputError(`Допустимо не больше ${field.max ?? 3000} символов.`);
  if ((field.max ?? 0) > 4000) {
    form.textDraft = text;
    await prompt(ctx);
    return;
  }
  await acceptValue(ctx, text);
}
