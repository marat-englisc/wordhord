# Репозитории

Каждая модель имеет файл в `src/db/repositories`. Функции следуют образцу
`userRepository.ts`: именованные `async`-функции, общий `db`, `try/catch`,
`console.error` и повторное выбрасывание ошибки. Импортируйте функции из
конкретного файла в подкаталогах `card`, `user`, `grammar`.

## Общий контракт

Для модели `Card` доступны:

- `createCard(data)` — созданная запись;
- `getCardById(id)` — запись или `null`;
- `getCards(options?)` — массив, при отсутствии результатов `[]`;
- `countCards(filters?)` — число записей с теми же фильтрами;
- `updateCard(id, data)` — обновлённая запись или `null`;
- `deleteCard(id)` — удалённая запись или `null`;
- `createCards(data[])` — пакетная вставка материалов одной транзакцией.
  Пустой массив возвращает `[]`; ошибка любой строки откатывает весь пакет.

Для остальных моделей названия строятся аналогично. У `UserRule` нет изменяемых
полей: связь создаётся и удаляется, отдельной функции обновления нет. Пакетная
вставка доступна для колод, карточек, значений, примеров, атрибутов и материалов
грамматики. Пользовательские связи имеют специальные функции `getOrCreate*`.

В каждом репозитории экспортируются типы `Model`, `NewModel`,
`UpdateModel` (если есть обновление), `ModelFilters` и `ModelQuery`.
Они выводятся из схем Drizzle. `id`, `createdAt`, `updatedAt` задаются базой/ORM.
Обновление пользовательских записей не меняет владельца и объект связи;
Telegram ID пользователя также неизменяемый. Пустое обновление и изменение
защищённых полей вызывают ошибку.

Параметры списков — фильтры плюс `{ limit?, offset? }`. Оба значения должны быть
целыми неотрицательными безопасными числами; `limit: 0` возвращает `[]`.
Без `limit` читаются все доступные записи (технический предел —
`Number.MAX_SAFE_INTEGER`, позволяющий также использовать один `offset`).
`count*` считает все подходящие записи независимо от пагинации.

Фильтры объединяются через AND. `search` ищет подстроку в перечисленных ниже
текстовых полях через OR, без интерпретации `%` и `_` как шаблонов.
Параметры передаются в SQL через Drizzle. SQLite `lower()` обеспечивает
нечувствительность к регистру для ASCII; регистр кириллицы и других символов
автоматически не нормализуется. Это ограничение встроенной функции
[SQLite lower()](https://www.sqlite.org/lang_corefunc.html#lower).

## Модели и фильтры

| Репозиторий | Функция списка | Фильтры | Поля `search` |
| --- | --- | --- | --- |
| `userRepository.ts` | `getUsers` | `telegramId`, `username`, `isAdmin` | `username`, `firstName`, `lastName` |
| `deckRepository.ts` | `getDecks` | `name` | `name` |
| `cardRepository.ts` | `getCards` | `deckId`, `title` | `title`, `transcription` |
| `cardMeaningRepository.ts` | `getCardMeanings` | `cardId` | `meaning`, `meaningTranslation`, `hint` |
| `cardExampleRepository.ts` | `getCardExamples` | `cardMeaningId` | `example`, `exampleTranslation` |
| `attributeRepository.ts` | `getAttributes` | `name` | `name` |
| `cardMeaningAttributeRepository.ts` | `getCardMeaningAttributes` | `cardMeaningId`, `attributeId`, `value` | — |
| `userDeckRepository.ts` | `getUserDecks` | `userId`, `deckId` | — |
| `userCardMeaningRepository.ts` | `getUserCardMeanings` | `userId`, `cardMeaningId`, `state`, `dueBefore`, `dueAfter` | — |
| `userCardMeaningReviewRepository.ts` | `getUserCardMeaningReviews` | `userId`, `cardMeaningId`, `userCardMeaningId`, `rating`, `state`, `reviewFrom`, `reviewTo` | — |
| `ruleRepository.ts` | `getRules` | `name` | `name` |
| `ruleImageRepository.ts` | `getRuleImages` | `ruleId` | — |
| `ruleSectionRepository.ts` | `getRuleSections` | `ruleId` | `title`, `content` |
| `ruleSectionExampleRepository.ts` | `getRuleSectionExamples` | `ruleSectionId` | `example`, `exampleTranslation` |
| `ruleSectionPrimaryInfoRepository.ts` | `getRuleSectionPrimaryInfos` | `ruleSectionId` | `content` |
| `userRuleRepository.ts` | `getUserRules` | `userId`, `ruleId` | — |
| `userRuleCommentRepository.ts` | `getUserRuleComments` | `userId`, `ruleId` | `comment` |

Списки материалов грамматики сортируются по `order ASC, id ASC`; значения
`order` могут совпадать. Прогресс — по `due ASC, id ASC`; история повторений —
по `review DESC, id DESC`. Остальные списки сортируются по `id ASC`.
Даты FSRS и `lastReviewedAt` принимаются и возвращаются как `Date`.

## Пользователь и его коллекции

`getUserById(telegramId)` сохраняет поведение исходного образца: ищет по
Telegram ID. Для нового кода есть явные `getUserByTelegramId(telegramId)` и
`getUserByDatabaseId(id)`. Все `userId` в других репозиториях — внутренний
`user.id`, а не Telegram ID.

`getOrCreateUser(data)` возвращает `{ user, created }`. Повторная регистрация
с тем же Telegram ID возвращает существующего пользователя и не перезаписывает
его профиль или права. Для обновления профиля используйте `updateUser`.

| Объект | Получение по паре | Создание без дублей | Удаление по паре |
| --- | --- | --- | --- |
| Колода | `getUserDeckByUserAndDeck(userId, deckId)` | `getOrCreateUserDeck(data)` | `deleteUserDeckByUserAndDeck(userId, deckId)` |
| Правило | `getUserRuleByUserAndRule(userId, ruleId)` | `getOrCreateUserRule(data)` | `deleteUserRuleByUserAndRule(userId, ruleId)` |
| Прогресс | `getUserCardMeaningByUserAndCardMeaning(userId, cardMeaningId)` | `getOrCreateUserCardMeaning(data)` | `deleteUserCardMeaningByUserAndCardMeaning(userId, cardMeaningId)` |
| Заметка | `getUserRuleCommentByUserAndRule(userId, ruleId)` | `saveUserRuleComment(userId, ruleId, comment)` | `deleteUserRuleCommentByUserAndRule(userId, ruleId)` |

`getOrCreate*` для связей возвращает саму запись, сохраняя существующие данные:
повторное добавление колоды не сбрасывает дату повторения, а повторное добавление
значения не сбрасывает FSRS-прогресс.

`getDecksForUser(userId, options?)` возвращает массив `{ deck, subscription }`.
`getRulesForUser(userId, options?)` — массив `{ rule, userRule }`, отсортированный
по порядку правил. `markUserDeckReviewed(userId, deckId, reviewedAt?)` обновляет
дату существующей связи; по умолчанию используется текущая дата.

`saveUserRuleComment` создаёт или обновляет единственную личную заметку на
правило. Сохраняются её `id` и `createdAt`, обновляется `updatedAt`.
Пустая строка допустима. Удаление пользовательской связи с правилом сохраняет
заметку; удаление пользователя или самого правила удаляет её каскадно.

## Полное содержимое

`getCardDetails(id)` возвращает карточку с `meanings[]`. Каждое значение
содержит `examples[]` и `attributes[]`; у каждой связи атрибута есть поле
`attribute` с записью справочника. Несколько значений одного атрибута сохраняются.

`getCardMeaningAttributeByValue(cardMeaningId, attributeId, value)` ищет
конкретную связь. `getOrCreateCardMeaningAttribute(data)` повторно использует
связь с той же тройкой полей.

`getRuleDetails(id)` возвращает правило с `images[]` и `sections[]`. Разделы
содержат `examples[]` и `primaryInfos[]`, отсортированные по `order, id`.
Обе функции полного чтения выполняются в транзакции для согласованного снимка.
Они возвращают `null`, если корневой записи нет, и пустые массивы для отсутствующих
дочерних материалов. Дочерние записи загружаются группами, без запроса на каждый
раздел или значение.

## Повторения и история FSRS

- `getDueUserCardMeanings(userId, dueBefore?, options?)` — прогресс с
  `due <= dueBefore`; дата по умолчанию текущая. В `options` доступны
  `deckId`, `state`, `limit`, `offset`.
- `getUnstudiedCardMeanings(userId, deckId, options?)` — значения выбранной
  колоды, для которых у пользователя ещё нет прогресса.
- `getUserCardMeaningStatistics(userId, asOf?)` — массив
  `{ state, total, due }` для присутствующих состояний. У пользователя без
  прогресса — `[]`. Здесь `due` — число назначенных повторений до указанной даты
  включительно.
- `getLatestUserCardMeaningReview(userCardMeaningId)` — последняя запись
  истории или `null`; при одинаковом времени выбирается наибольший `id`.
- `getUserCardMeaningReviews({ userId, userCardMeaningId, reviewFrom, reviewTo, ... })`
  — история. `reviewFrom` включительно, `reviewTo` исключительно.
  `dueBefore` и `dueAfter` в обычном списке прогресса включительны.
- `recordUserCardMeaningReview(userCardMeaningId, progress, review)` —
  обновление полной FSRS-карточки и вставка журнала одной транзакцией.
  Возвращает `{ progress, review }` или `null`, если прогресса нет.
  Владелец и значение журнала берутся из существующего прогресса.
  Ошибка обновления или журнала откатывает обе записи.

В `ReviewProgress` обязательны все поля FSRS-карточки и `lastReview: Date`;
в `NewReviewLog` обязательны `lastElapsedDays` и `learningSteps`.
Поля `userId`, `cardMeaningId`, `userCardMeaningId` в эту операцию не передаются.
Данные вычисляет `ts-fsrs` в вызывающем коде; репозиторий сохраняет их.

Обычные функции создания/редактирования журнала доступны для отдельных операций,
но при сохранении результата повторения используйте
`recordUserCardMeaningReview`, чтобы прогресс и история изменялись вместе.

Драйвер `node:sqlite` использует синхронные транзакции: callback не является
`async`, запросы внутри выполняются через `.get()`/`.all()`. Внешние функции
репозиториев остаются `async`, как в образце.

## Пример

```ts
import { getOrCreateUser } from "./db/repositories/user/userRepository";
import { getCards } from "./db/repositories/card/cardRepository";
import { getRuleDetails } from "./db/repositories/grammar/ruleRepository";
import { saveUserRuleComment } from "./db/repositories/user/userRuleCommentRepository";
import { getDueUserCardMeanings } from "./db/repositories/user/userCardMeaningRepository";

const { user } = await getOrCreateUser({
  telegramId: ctx.from.id,
  firstName: ctx.from.first_name,
});
const cards = await getCards({ deckId, search: "read", limit: 20, offset: 0 });
const rule = await getRuleDetails(ruleId);
await saveUserRuleComment(user.id, ruleId, "Моя заметка");
const due = await getDueUserCardMeanings(user.id, new Date(), {
  deckId,
  limit: 20,
});
```

Функции с `id` получают внутренний первичный ключ записи. Репозитории не
проверяют полномочия Telegram-пользователя; обработчики передают нужный
`user.id` и выбирают операции по паре, когда работают с личными данными.
Удаления соблюдают ограничения схемы: например, колода с карточками не удаляется
из-за `RESTRICT`; ошибки ограничений логируются и передаются вызывающему коду.

## Проверка и документация

`npm test` собирает TypeScript и запускает интеграционные проверки на SQLite
в памяти. Используются настоящие миграции и драйвер; файл приложения и Telegram
не затрагиваются.

Реализация использует официальные API Drizzle:
[Select](https://orm.drizzle.team/docs/sqlite/select),
[Insert и конфликты](https://orm.drizzle.team/docs/sqlite/insert),
[Update](https://orm.drizzle.team/docs/sqlite/update),
[Delete](https://orm.drizzle.team/docs/sqlite/delete),
[Transactions](https://orm.drizzle.team/docs/transactions).
Способ выполнения синхронных транзакций сверён также с установленным драйвером
`drizzle-orm/node-sqlite`.
