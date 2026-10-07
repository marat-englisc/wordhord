const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wordhord-two-db-'));
function newPaths() {
  const folder = fs.mkdtempSync(path.join(root, 'fixture-'));
  return { contentPath: path.join(folder, "content's база.db"), usersPath: path.join(folder, 'users.db') };
}
const globalPaths = newPaths();
process.env.CONTENT_DATABASE_URL = globalPaths.contentPath;
process.env.USERS_DATABASE_URL = globalPaths.usersPath;
const { migrateDatabases } = require('../dist/db/migrate');
const { openApplicationDatabase, resolveDatabasePaths } = require('../dist/db/connection');
const { CONTENT_TABLES, USER_TABLES, getTableNames } = require('../dist/db/layout');
migrateDatabases(globalPaths);
const { db: defaultDb } = require('../dist/config/db');
const { createStudyRepository } = require('../dist/db/repositories/studyRepository');
const { createStudyService } = require('../dist/core/fsrs/studyService');
const NOW = new Date('2026-10-07T12:00:00.000Z');

test.after(() => {
  defaultDb.$client.close();
  // Delete only the exact temporary root created by this test file.
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('wordhord-two-db-'));
  fs.rmSync(root, { recursive: true, force: true });
});

function fixture(t) {
  const paths = newPaths();
  migrateDatabases(paths);
  const database = openApplicationDatabase(paths);
  t.after(() => { if (database.$client.isOpen) database.$client.close(); });
  return { paths, database, client: database.$client };
}
function seed(client, withProgress = true) {
  client.exec(`
    INSERT INTO deck(id,name,updated_at) VALUES (20,'Words','2026-10-01 00:00:00');
    INSERT INTO attribute(id,name,updated_at) VALUES (25,'Part of speech','2026-10-01 00:00:00');
    INSERT INTO card(id,deck_id,title,updated_at) VALUES (30,20,'run','2026-10-01 00:00:00');
    INSERT INTO card_meaning(id,card_id,meaning,meaning_translation,updated_at)
      VALUES (40,30,'move quickly','бежать','2026-10-01 00:00:00');
    INSERT INTO card_example(id,card_meaning_id,example,example_translation) VALUES(45,40,'I run','Я бегу');
    INSERT INTO card_meaning_attribute(id,card_meaning_id,attribute_id,value,updated_at)
      VALUES(46,40,25,'verb','2026-10-01 00:00:00');
    INSERT INTO rule(id,"order",name) VALUES(60,0,'Present simple');
    INSERT INTO rule_image(id,rule_id,image_url) VALUES(61,60,'https://example.com/grammar.png');
    INSERT INTO rule_section(id,rule_id,title,content) VALUES(62,60,'Usage','Regular actions');
    INSERT INTO rule_section_example(id,rule_section_id,example,example_translation) VALUES(63,62,'I run','Я бегаю');
    INSERT INTO rule_section_primary_info(id,rule_section_id,content) VALUES(64,62,'Use the base form');
    INSERT INTO user(id,telegram_id,username) VALUES(1,12345,'student');
    INSERT INTO user_deck(id,user_id,deck_id) VALUES(70,1,20);
    INSERT INTO user_rule(id,user_id,rule_id) VALUES(80,1,60);
    INSERT INTO user_rule_comment(id,user_id,rule_id,comment) VALUES(90,1,60,'Моя заметка');
  `);
  if (withProgress) client.exec(`
    INSERT INTO user_card_meaning(id,user_id,card_meaning_id,due,stability,difficulty,
      elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review)
      VALUES(100,1,40,1791288000000,2.3,5.4,3,2,0,4,1,2,1791115200000);
    INSERT INTO user_card_meaning_review(id,user_id,card_meaning_id,user_card_meaning_id,rating,state,
      due,stability,difficulty,scheduled_days,elapsed_days,last_elapsed_days,learning_steps,review)
      VALUES(101,1,40,100,3,2,1790942400000,2.1,5.4,2,3,2,0,1791115200000);
  `);
}
function count(client, table) { return Number(client.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n); }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function service(database) {
  return createStudyService({ repository: createStudyRepository(database), clock: () => NOW,
    policy: { timeZone: 'Europe/Moscow' } });
}
async function expectFailure(operation, pattern) {
  const original = console.error;
  console.error = () => {};
  try { await assert.rejects(operation, pattern); } finally { console.error = original; }
}

test('existing repositories write to the right physical files and retain cross-file joins', async () => {
  const decks = require('../dist/db/repositories/card/deckRepository');
  const cards = require('../dist/db/repositories/card/cardRepository');
  const meanings = require('../dist/db/repositories/card/cardMeaningRepository');
  const users = require('../dist/db/repositories/user/userRepository');
  const subscriptions = require('../dist/db/repositories/user/userDeckRepository');
  const rules = require('../dist/db/repositories/grammar/ruleRepository');
  const userRules = require('../dist/db/repositories/user/userRuleRepository');
  const notes = require('../dist/db/repositories/user/userRuleCommentRepository');
  const deck = await decks.createDeck({ name: 'Animals' });
  const card = await cards.createCard({ deckId: deck.id, title: 'cat' });
  const meaning = await meanings.createCardMeaning({ cardId: card.id, meaning: 'an animal', meaningTranslation: 'кот' });
  const user = await users.createUser({ telegramId: 789, username: 'cat_student' });
  await subscriptions.getOrCreateUserDeck({ userId: user.id, deckId: deck.id });
  const rule = await rules.createRule({ name: 'Plural', order: 0 });
  await userRules.getOrCreateUserRule({ userId: user.id, ruleId: rule.id });
  await notes.createUserRuleComment({ userId: user.id, ruleId: rule.id, comment: 'One note' });
  assert.equal((await subscriptions.getDecksForUser(user.id))[0].deck.name, 'Animals');
  assert.equal((await userRules.getRulesForUser(user.id))[0].rule.name, 'Plural');
  assert.equal((await cards.getCardDetails(card.id)).meanings[0].id, meaning.id);
  assert.equal((await rules.getRuleDetails(rule.id)).name, 'Plural');
  for (const [file, expected, forbidden] of [
    [globalPaths.contentPath, CONTENT_TABLES, USER_TABLES],
    [globalPaths.usersPath, USER_TABLES, CONTENT_TABLES],
  ]) {
    const client = new DatabaseSync(file, { readOnly: true });
    try {
      const names = getTableNames(client);
      for (const table of expected) assert.ok(names.includes(table), table);
      for (const table of forbidden) assert.ok(!names.includes(table), table);
    } finally { client.close(); }
  }
});

test('FSRS reads attached content and commits only progress, history and user subscription', async (t) => {
  const { database, client, paths } = fixture(t);
  seed(client, false);
  const study = service(database);
  const item = await study.getNextStudyCard(1);
  assert.equal(item.card.title, 'run');
  const contentBefore = hash(paths.contentPath);
  const preview = await study.previewCardReview(1, { cardMeaningId: 40, version: item.version });
  const result = await study.reviewCard(1, { cardMeaningId: 40, version: item.version, rating: 3 });
  assert.equal(result.progress.due.getTime(), preview.outcomes[3].progress.due.getTime());
  assert.equal(result.progress.reps, 1);
  assert.equal(count(client, 'user_card_meaning_review'), 1);
  assert.equal(client.prepare('SELECT last_reviewed_at FROM user_deck').get().last_reviewed_at, NOW.getTime());
  assert.equal(hash(paths.contentPath), contentBefore);
  assert.equal(count(client, 'rule'), 1);
  assert.equal(count(client, 'user_rule_comment'), 1);
  await expectFailure(() => study.reviewCard(1, { cardMeaningId: 40, version: item.version, rating: 3 }),
    (error) => error.code === 'STALE_CARD');
  assert.equal(count(client, 'user_card_meaning_review'), 1);
});

test('failed FSRS history write rolls back progress and lastReviewedAt', async (t) => {
  const { database, client } = fixture(t);
  seed(client, false);
  const study = service(database);
  const item = await study.getNextStudyCard(1);
  client.exec(`CREATE TEMP TRIGGER fail_review BEFORE INSERT ON main.user_card_meaning_review
    BEGIN SELECT RAISE(ABORT,'test failure'); END;`);
  await expectFailure(() => study.reviewCard(1, { cardMeaningId: 40, version: item.version, rating: 3 }),
    (error) => error.cause?.message === 'test failure');
  assert.equal(count(client, 'user_card_meaning'), 0);
  assert.equal(count(client, 'user_card_meaning_review'), 0);
  assert.equal(client.prepare('SELECT last_reviewed_at FROM user_deck').get().last_reviewed_at, null);
});

test('cross-file references reject missing content on inserts and updates; native FKs remain active', (t) => {
  const { client } = fixture(t);
  seed(client);
  for (const sql of [
    'INSERT INTO user_deck(user_id,deck_id) VALUES(1,999)',
    'INSERT INTO user_rule(user_id,rule_id) VALUES(1,999)',
    "INSERT INTO user_rule_comment(user_id,rule_id,comment) VALUES(1,999,'note')",
    'INSERT INTO user_card_meaning(user_id,card_meaning_id,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state) VALUES(1,999,0,0,0,0,0,0,0,0,0)',
    'UPDATE user_deck SET deck_id=999 WHERE id=70',
    'UPDATE user_rule SET rule_id=999 WHERE id=80',
    'UPDATE user_rule_comment SET rule_id=999 WHERE id=90',
    'UPDATE user_card_meaning SET card_meaning_id=999 WHERE id=100',
  ]) assert.throws(() => client.exec(sql), /Content reference missing/);
  assert.throws(() => client.exec('INSERT INTO user_deck(user_id,deck_id) VALUES(999,20)'), /FOREIGN KEY/);
  assert.throws(() => client.exec("INSERT INTO card(deck_id,title,updated_at) VALUES(999,'bad','x')"), /FOREIGN KEY/);
  assert.throws(() => client.exec('UPDATE user_card_meaning_review SET user_id=999 WHERE id=101'), /FOREIGN KEY/);
  assert.throws(() => client.exec('UPDATE user_card_meaning_review SET last_elapsed_days=NULL WHERE id=101'), /NOT NULL/);
  assert.throws(() => client.exec('UPDATE user_card_meaning_review SET learning_steps=NULL WHERE id=101'), /NOT NULL/);
  client.exec("INSERT INTO deck(id,name,updated_at) VALUES(21,'Empty','x'); INSERT INTO user_deck(user_id,deck_id) VALUES(1,21)");
  assert.throws(() => client.exec('UPDATE deck SET id=22 WHERE id=21'), /Referenced content IDs/);
});

test('content deletion cascades across both files, including nested card and grammar children', (t) => {
  const { client } = fixture(t);
  seed(client);
  assert.throws(() => client.exec('DELETE FROM deck WHERE id=20'), /FOREIGN KEY/);
  assert.equal(count(client, 'user_deck'), 1);
  client.exec('DELETE FROM card WHERE id=30');
  for (const table of ['card_meaning', 'card_example', 'card_meaning_attribute', 'user_card_meaning', 'user_card_meaning_review']) {
    assert.equal(count(client, table), 0, table);
  }
  client.exec('DELETE FROM deck WHERE id=20; DELETE FROM rule WHERE id=60');
  for (const table of ['user_deck', 'user_rule', 'user_rule_comment', 'rule_image', 'rule_section', 'rule_section_example', 'rule_section_primary_info']) {
    assert.equal(count(client, table), 0, table);
  }
  assert.equal(count(client, 'user'), 1);
});

test('deleting an account removes personal rows and keeps the shared content', (t) => {
  const { client } = fixture(t);
  seed(client);
  client.exec('DELETE FROM user WHERE id=1');
  for (const table of USER_TABLES) assert.equal(count(client, table), 0, table);
  for (const table of CONTENT_TABLES) assert.equal(count(client, table), 1, table);
});

test('a failing transaction restores changes and cascading deletions in both files', (t) => {
  const { database, client } = fixture(t);
  seed(client);
  assert.throws(() => database.transaction(() => {
    client.exec("UPDATE deck SET name='changed' WHERE id=20; DELETE FROM card WHERE id=30; DELETE FROM rule WHERE id=60");
    throw new Error('rollback both');
  }, { behavior: 'immediate' }), /rollback both/);
  assert.equal(client.prepare('SELECT name FROM deck').get().name, 'Words');
  for (const table of [...CONTENT_TABLES, ...USER_TABLES]) assert.equal(count(client, table), 1, table);
  assert.equal(client.prepare('PRAGMA main.journal_mode').get().journal_mode, 'delete');
  assert.equal(client.prepare('PRAGMA content.journal_mode').get().journal_mode, 'delete');
  assert.equal(client.prepare('PRAGMA main.synchronous').get().synchronous, 2);
  assert.equal(client.prepare('PRAGMA content.synchronous').get().synchronous, 2);
});

test('reopening reinstalls connection guards and refuses orphaned content references', (t) => {
  const { database, client, paths } = fixture(t);
  seed(client);
  client.close();
  const reopened = openApplicationDatabase(paths);
  assert.throws(() => reopened.$client.exec('UPDATE user_deck SET deck_id=999'), /Content reference missing/);
  reopened.$client.close();
  const raw = new DatabaseSync(paths.usersPath);
  raw.exec('UPDATE user_deck SET deck_id=999');
  raw.close();
  assert.throws(() => openApplicationDatabase(paths), /Content reference missing/);
  assert.ok(!database.$client.isOpen);
});

test('paths cannot alias one file; migrations reject the wrong layout and are repeatable', (t) => {
  const { paths, client } = fixture(t);
  seed(client);
  assert.throws(() => resolveDatabasePaths({ contentPath: paths.contentPath, usersPath: paths.contentPath }), /different files/);
  assert.throws(() => resolveDatabasePaths({ contentPath: ':memory:', usersPath: paths.usersPath }), /file-backed/);
  assert.throws(() => resolveDatabasePaths({ contentPath: 'file:content.db', usersPath: paths.usersPath }), /ordinary file/);
  const alias = `${path.dirname(paths.contentPath)}${path.sep}.${path.sep}${path.basename(paths.contentPath)}`;
  assert.throws(() => resolveDatabasePaths({ contentPath: paths.contentPath, usersPath: alias }), /different files/);
  migrateDatabases(paths);
  assert.equal(count(client, 'user_card_meaning_review'), 1);
  assert.throws(() => migrateDatabases({ contentPath: paths.usersPath, usersPath: paths.contentPath }), /other database/);
});

test('migration CLI creates both configured databases and can run again', () => {
  const paths = newPaths();
  const env = { ...process.env, CONTENT_DATABASE_URL: paths.contentPath, USERS_DATABASE_URL: paths.usersPath };
  const cli = path.resolve('node_modules/tsx/dist/cli.mjs');
  const migrated = execFileSync(process.execPath, [cli, 'src/db/migrate.ts'], { env, encoding: 'utf8' });
  assert.match(migrated, /User migrations applied/);
  execFileSync(process.execPath, [cli, 'src/db/migrate.ts'], { env, encoding: 'utf8' });
  const db = openApplicationDatabase(paths);
  try {
    for (const table of [...CONTENT_TABLES, ...USER_TABLES]) assert.equal(count(db.$client, table), 0, table);
  }
  finally { db.$client.close(); }
});
