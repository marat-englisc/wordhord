const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, readFile, readdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, relative, isAbsolute } = require('node:path');
const { Bot } = require('grammy');
const { CONSTANTS } = require('../dist/config/constants');
const { migrateDatabases } = require('../dist/db/migrate');
const { closeDatabase } = require('../dist/config/db');
const { registerHandlers } = require('../dist/bot/handlers');
const { createStudyService } = require('../dist/core/fsrs');
const decks = require('../dist/db/repositories/card/deckRepository');
const cards = require('../dist/db/repositories/card/cardRepository');
const meanings = require('../dist/db/repositories/card/cardMeaningRepository');
const users = require('../dist/db/repositories/user/userRepository');
const subscriptions = require('../dist/db/repositories/user/userDeckRepository');
const progress = require('../dist/db/repositories/user/userCardMeaningRepository');
const reviews = require('../dist/db/repositories/user/userCardMeaningReviewRepository');
const rules = require('../dist/db/repositories/grammar/ruleRepository');
const sections = require('../dist/db/repositories/grammar/ruleSectionRepository');
const notes = require('../dist/db/repositories/user/userRuleCommentRepository');
const learned = require('../dist/db/repositories/user/userRuleRepository');
const { entities } = require('../dist/bot/admin/entities');
const { AUDIO_DIRECTORY, MAX_AUDIO_BYTES, saveUploadedAudio, discardUnusedAudio, resolveAudioPath, audioInput } = require('../dist/bot/audio');

let directory;
beforeEach(async () => {
  closeDatabase();
  directory = await mkdtemp(join(tmpdir(), 'wordhord-handlers-'));
  CONSTANTS.CONTENT_DATABASE_URL = join(directory, 'content.db');
  CONSTANTS.USERS_DATABASE_URL = join(directory, 'users.db');
  migrateDatabases({ contentPath: CONSTANTS.CONTENT_DATABASE_URL, usersPath: CONSTANTS.USERS_DATABASE_URL });
});
afterEach(async () => {
  closeDatabase();
  const target = relative(tmpdir(), directory);
  assert.ok(!isAbsolute(target) && !target.startsWith('..') && target.startsWith('wordhord-handlers-'));
  await rm(directory, { recursive: true, force: true });
});

function harness(options = {}) {
  const bot = new Bot('123456:TEST_ONLY', { botInfo: { id: 123456, is_bot: true, first_name: 'Wordhord', username: 'wordhord_test_bot' } });
  const calls = [];
  const messages = new Map();
  let updateId = 0, messageId = 100;
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    if (method === 'getFile') return { ok: true, result: { file_id: payload.file_id, file_unique_id: 'unique', file_path: 'audio/test.mp3' } };
    if (method === 'answerCallbackQuery' || method === 'setMyCommands') return { ok: true, result: true };
    const id = method === 'editMessageText' ? payload.message_id : ++messageId;
    const message = { message_id: id, date: 1, chat: { id: payload.chat_id, type: 'private' }, text: payload.text, reply_markup: payload.reply_markup };
    messages.delete(`${payload.chat_id}:${id}`);
    messages.set(`${payload.chat_id}:${id}`, message);
    return { ok: true, result: message };
  });
  registerHandlers(bot, { adminIds: new Set([1]), timeZone: 'Europe/Moscow', ...options });
  const from = (id) => ({ id, is_bot: false, first_name: `User <${id}>`, username: `user${id}` });
  return { bot, calls,
    async text(text, id = 1, extra = {}) {
      const message = { message_id: ++messageId, date: 1, chat: { id, type: 'private' }, from: from(id), text, ...extra };
      if (text?.startsWith('/')) message.entities = [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }];
      await bot.handleUpdate({ update_id: ++updateId, message });
    },
    async click(data, id = 1, target) {
      const message = target ?? this.latest(id);
      await bot.handleUpdate({ update_id: ++updateId, callback_query: { id: `q${updateId}`, from: from(id), chat_instance: 'test', data, message } });
    },
    latest(id = 1) { return Array.from(messages.values()).filter((m) => m.chat.id === id).at(-1); },
    button(prefix, id = 1) {
      assert.ok(this.latest(id)?.reply_markup, `Missing keyboard: ${JSON.stringify(this.latest(id))}`);
      const button = this.latest(id).reply_markup.inline_keyboard.flat().find((b) => b.callback_data?.startsWith(prefix));
      assert.ok(button, `Button ${prefix} missing from ${this.latest(id).text}`);
      return button.callback_data;
    },
  };
}

async function seed() {
  const deck = await decks.createDeck({ name: 'Everyday English' });
  const card = await cards.createCard({ deckId: deck.id, title: 'apple', transcription: '/ˈæpəl/' });
  const meaning = await meanings.createCardMeaning({ cardId: card.id, meaning: 'a round fruit', meaningTranslation: 'яблоко', hint: 'Еда' });
  return { deck, card, meaning };
}

test('roles, forged admin callbacks, private chat restriction, and identity escaping', async () => {
  const h = harness();
  await h.text('/start', 2);
  assert.match(h.latest(2).text, /User &lt;2&gt;/);
  assert.equal(h.latest(2).reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'admin'), false);
  await h.click('a:new:deck:0', 2);
  assert.match(h.latest(2).text, /только администраторам/);
  assert.equal(await decks.countDecks(), 0);
  await h.text('/start');
  assert.match(h.latest().text, /Администратор/);
  assert.equal(h.button('admin'), 'admin');
  // Removing an environment grant does not leave a stored database grant.
  assert.equal((await users.getUserByTelegramId(1)).isAdmin, false);
  await h.bot.handleUpdate({ update_id: 999, message: { message_id: 1, date: 1, from: { id: 3, is_bot: false, first_name: 'Group user' }, chat: { id: -100, type: 'supergroup' }, text: '/start', entities: [{ type: 'bot_command', offset: 0, length: 6 }] } });
  assert.equal(await users.getUserByTelegramId(3), null);
});

test('database admin grants are rechecked during an active form', async () => {
  const h = harness({ adminIds: new Set() });
  await h.text('/start');
  const user = await users.getUserByTelegramId(1);
  await users.updateUser(user.id, { isAdmin: true });
  await h.text('/admin');
  await h.click('a:new:deck:0');
  await users.updateUser(user.id, { isAdmin: false });
  await h.text('Unauthorized deck');
  assert.match(h.latest().text, /Нет активной формы/);
  assert.equal(await decks.countDecks(), 0);
});

test('deck selection, hidden answer, grading, duplicate callbacks, and preserved progress', async () => {
  const { deck, meaning } = await seed();
  const h = harness();
  await h.text('/start', 2);
  await h.click(`study:${deck.id}`, 2);
  assert.match(h.latest(2).text, /больше недоступна/);
  await h.click(`join:${deck.id}`, 2);
  await h.click(`study:${deck.id}`, 2);
  assert.match(h.latest(2).text, /apple/);
  assert.doesNotMatch(h.latest(2).text, /яблоко|a round fruit/);
  const reveal = h.button('reveal:', 2);
  const token = reveal.split(':')[1];
  await h.click(`rate:${token}:3`, 2);
  assert.match(h.latest(2).text, /Сначала открой ответ/);
  // The input error creates a new message; the study callback remains on its original message.
  const question = h.calls.findLast((c) => c.method === 'editMessageText' && c.payload.text.includes('Вспомни значение'));
  const original = { message_id: question.payload.message_id, date: 1, chat: { id: 2, type: 'private' }, text: question.payload.text };
  await h.click(reveal, 2, original);
  assert.match(h.latest(2).text, /яблоко/);
  const grade = h.button('rate:', 2).replace(/:1$/, ':3');
  await h.click(grade, 2, original);
  const user = await users.getUserByTelegramId(2);
  const saved = await progress.getUserCardMeaningByUserAndCardMeaning(user.id, meaning.id);
  assert.equal(saved.reps, 1);
  await h.click(grade, 2, original);
  assert.equal((await reviews.getUserCardMeaningReviews({ userId: user.id })).length, 1);
  await h.click(`leave:${deck.id}`, 2);
  assert.equal(await subscriptions.getUserDeckByUserAndDeck(user.id, deck.id), null);
  assert.ok(await progress.getUserCardMeaningByUserAndCardMeaning(user.id, meaning.id));
  await h.click(`join:${deck.id}`, 2);
  assert.equal((await progress.getUserCardMeaningByUserAndCardMeaning(user.id, meaning.id)).reps, 1);
});

test('grading sessions are isolated by user and reject concurrent repeated answers', async () => {
  const { deck } = await seed();
  const h = harness();
  for (const id of [1, 2]) { await h.text('/start', id); await h.click(`join:${deck.id}`, id); await h.click(`study:${deck.id}`, id); }
  const firstMessage = h.latest();
  const reveal = h.button('reveal:');
  await h.click(reveal, 2);
  assert.match(h.latest(2).text, /уже закрыта/);
  await h.click(reveal, 1, firstMessage);
  const grade = h.button('rate:');
  const answer = h.latest();
  await Promise.all([h.click(grade, 1, answer), h.click(grade, 1, answer)]);
  const user = await users.getUserByTelegramId(1);
  assert.equal((await reviews.getUserCardMeaningReviews({ userId: user.id })).length, 1);
});

test('grammar paging, personal notes, learned marks, and long escaped messages', async () => {
  const rule = await rules.createRule({ name: '<Present Simple>', order: 0 });
  await sections.createRuleSection({ ruleId: rule.id, title: 'Usage', content: '<&>'.repeat(3500), order: 0 });
  const h = harness();
  await h.text('/grammar', 2);
  await h.click(`rule:${rule.id}:0`, 2);
  assert.ok(h.latest(2).reply_markup.inline_keyboard.flat().some((b) => b.text === 'Далее ›'));
  await h.click(`learned:${rule.id}:1`, 2);
  const user = await users.getUserByTelegramId(2);
  assert.ok(await learned.getUserRuleByUserAndRule(user.id, rule.id));
  await h.click(`noteEdit:${rule.id}`, 2);
  await h.text('Моя <подсказка> & пример', 2);
  assert.equal((await notes.getUserRuleCommentByUserAndRule(user.id, rule.id)).comment, 'Моя <подсказка> & пример');
  await h.text('/start', 3);
  await h.click(`note:${rule.id}`, 3);
  assert.doesNotMatch(h.latest(3).text, /подсказка/);
  await h.click(`noteDelete:${rule.id}`, 2);
  assert.equal(await notes.getUserRuleCommentByUserAndRule(user.id, rule.id), null);
  for (const call of h.calls.filter((c) => ['sendMessage', 'editMessageText'].includes(c.method))) assert.ok(call.payload.text.length <= 4096);
});

test('admin forms create, edit, cancel, confirm deletes, and enforce deck RESTRICT', async () => {
  const h = harness();
  await h.text('/admin');
  await h.click('a:new:deck:0');
  await h.text('Test deck');
  const staleSave = h.button('af:');
  await h.click(staleSave);
  const deck = (await decks.getDecks())[0];
  assert.equal(deck.name, 'Test deck');
  await h.click(staleSave);
  assert.equal(await decks.countDecks(), 1);
  await h.click(`a:edit:deck:${deck.id}:0`);
  await h.text('Renamed');
  await h.click(h.button('af:'));
  assert.equal((await decks.getDeckById(deck.id)).name, 'Renamed');
  const card = await cards.createCard({ title: 'keep', deckId: deck.id });
  await h.click(`a:delete:deck:${deck.id}`);
  await h.click(h.button('a:confirm:'));
  assert.match(h.latest().text, /Сначала удали слова/);
  assert.ok(await decks.getDeckById(deck.id));
  await h.click(`a:delete:card:${card.id}`);
  await h.click(h.button('a:confirm:'));
  assert.equal(await cards.getCardById(card.id), null);
  await h.click(`a:delete:deck:${deck.id}`);
  const confirm = h.button('a:confirm:');
  await h.text('/cancel');
  await h.click(confirm);
  assert.ok(await decks.getDeckById(deck.id));
});

test('all content types can be created by their forms, including multi-message grammar and attribute picker', async () => {
  const h = harness();
  await h.text('/admin');
  const fixtures = [
    ['deck', 0, ['Everyday']],
    ['card', 'deck', ['apple', '/æpəl/']],
    ['meaning', 'card', ['fruit', 'яблоко', null]],
    ['example', 'meaning', ['I eat an apple.', 'Я ем яблоко.']],
    ['attribute', 0, ['Часть речи']],
    ['link', 'meaning', ['@attribute', 'noun']],
    ['rule', 0, ['Present Simple', '0']],
    ['section', 'rule', ['Usage', 'Long grammar explanation', '0']],
    ['info', 'section', ['Remember this', '0']],
    ['ruleExample', 'section', ['I work.', 'Я работаю.', '0']],
    ['image', 'rule', ['https://example.com/image.png', '0']],
  ];
  const ids = {};
  for (const [key, parent, values] of fixtures) {
    await h.click(`a:new:${key}:${typeof parent === 'number' ? parent : ids[parent]}`);
    for (const value of values) {
      if (value === null) await h.click(h.button('af:'));
      else if (value === '@attribute') await h.click(h.button('af:'));
      else {
        await h.text(value);
        if (['section', 'info'].includes(key) && value !== '0' && h.latest().text.includes('Получено символов')) {
          await h.text('Continuation');
          await h.click(h.button('af:'));
        }
      }
    }
    await h.click(h.button('af:'));
    const rows = await entities[key].list({});
    assert.equal(rows.length, 1, `Creation failed for ${key}: ${h.latest().text}`);
    ids[key] = rows[0].id;
    for (const child of entities[key].children ?? []) {
      await h.click(`a:list:${child}:${ids[key]}:0`);
      assert.match(h.latest().text, /Добавь первую запись|Всего/);
    }
  }
  assert.match((await sections.getRuleSectionById(ids.section)).content, /Continuation/);
  // The form adapters must also support editing and deletion for every child type.
  for (const [key] of [...fixtures].reverse()) {
    await h.click(`a:edit:${key}:${ids[key]}:${entities[key].fields.length - 1}`);
    const field = entities[key].fields.at(-1);
    if (field.optional) await h.click(h.button('af:'));
    else if (field.kind === 'order') await h.text('1');
    else await h.text(key === 'image' ? 'https://example.com/new.png' : 'Updated');
    if (h.latest().text.includes('Получено символов')) await h.click(h.button('af:'));
    await h.click(h.button('af:'));
    await h.click(`a:delete:${key}:${ids[key]}`);
    await h.click(h.button('a:confirm:'));
    assert.equal(await entities[key].get(ids[key]), null, `Deletion failed for ${key}`);
  }
});

test('search, pagination, cancellation, and recovery after a bot restart', async () => {
  for (let i = 0; i < 11; i++) await decks.createDeck({ name: `Deck ${i}` });
  const h = harness();
  await h.text('/decks', 2);
  assert.ok(h.latest(2).reply_markup.inline_keyboard.flat().some((b) => b.text === 'Далее ›'));
  await h.click('search:decks', 2);
  await h.text('Deck 10', 2);
  assert.ok(h.latest(2).reply_markup.inline_keyboard.flat().some((b) => b.text === 'Deck 10'));
  await h.click('searchClear:decks', 2);
  await h.text('/start');
  await h.click('a:new:deck:0');
  await h.text('Draft');
  const otherBot = harness();
  await otherBot.text('/start');
  await otherBot.click(h.button('af:'));
  assert.match(otherBot.latest().text, /Форма устарела/);
  await h.text('/cancel');
  await h.text('Not a new deck');
  assert.equal(await decks.countDecks(), 11);
});

test('audio is stored in the root audio directory and failed/oversized downloads leave no files', async () => {
  const { card } = await seed();
  const h = harness();
  const originalFetch = global.fetch;
  const data = Buffer.from('ID3test-audio');
  global.fetch = async () => new Response(data);
  let saved;
  try {
    await h.text('/admin');
    await h.click(`a:audio:card:${card.id}`);
    await h.text(undefined, 1, { audio: { file_id: 'test', file_unique_id: 'test', duration: 1, file_name: '../../evil.mp3', file_size: data.length } });
    saved = (await cards.getCardById(card.id)).audioUrl;
    assert.match(saved, /^audio\/[a-f0-9-]+\.mp3$/);
    assert.deepEqual(await readFile(resolveAudioPath(saved)), data);
    await audioInput(saved);
    await h.click(`audio:${card.id}`);
    assert.ok(h.calls.some((c) => c.method === 'sendAudio'), h.latest().text);
    const before = await readdir(AUDIO_DIRECTORY);
    const ctx = { message: { audio: { file_id: 'fake', file_unique_id: 'fake', duration: 1, file_name: 'x.mp3' } }, api: { token: '123:secret', getFile: async () => ({ file_path: 'audio/x.mp3' }) } };
    await assert.rejects(saveUploadedAudio(ctx, async () => new Response('x', { headers: { 'content-length': String(MAX_AUDIO_BYTES + 1) } })), /20 МБ/);
    await assert.rejects(saveUploadedAudio(ctx, async () => new Response(new Uint8Array(MAX_AUDIO_BYTES + 1))), /20 МБ/);
    await assert.rejects(saveUploadedAudio(ctx, async () => { throw new Error('123:secret'); }), (error) => !error.message.includes('secret'));
    assert.deepEqual(await readdir(AUDIO_DIRECTORY), before);
    assert.throws(() => resolveAudioPath('../outside.mp3'));
    await h.click(`a:audioClear:card:${card.id}`);
    assert.equal((await cards.getCardById(card.id)).audioUrl, null);
    await assert.rejects(readFile(resolveAudioPath(saved)), { code: 'ENOENT' });
    await h.click(`a:audio:card:${card.id}`);
    await h.text(undefined, 1, { voice: { file_id: 'voice', file_unique_id: 'voice', duration: 1, mime_type: 'audio/ogg', file_size: data.length } });
    saved = (await cards.getCardById(card.id)).audioUrl;
    assert.match(saved, /\.ogg$/);
    await h.click(`audio:${card.id}`);
    assert.ok(h.calls.some((c) => c.method === 'sendVoice'));
  } finally {
    global.fetch = originalFetch;
    if (saved) { await cards.updateCard(card.id, { audioUrl: null }); await discardUnusedAudio(saved); }
  }
});

test('empty queues and daily limits explain the next action without early reviews', async () => {
  const { deck } = await seed();
  const study = createStudyService({ policy: { dailyNewLimit: 0, timeZone: 'Europe/Moscow' } });
  const h = harness({ study });
  await h.text('/study', 2);
  assert.match(h.latest(2).text, /Выбери первую колоду/);
  await h.click(`join:${deck.id}`, 2);
  await h.click(`study:${deck.id}`, 2);
  assert.match(h.latest(2).text, /Достигнут дневной лимит/);
  await h.text('/stats', 2);
  assert.match(h.latest(2).text, /Europe\/Moscow/);
});
