# wordhord

Telegram-бот для изучения английского языка. Контент хранится в `content.db`,
аккаунты, личные данные и история FSRS — в `users.db`. Используется SQLite и Drizzle ORM.

Требуется Node.js 24 или новее: подключение работает через встроенный `node:sqlite`.

1. Установить зависимости: `npm install`.
2. Скопировать `.env.example` в `.env` и задать `TELEGRAM_TOKEN`.
3. Задать `CONTENT_DATABASE_URL=./content.db` и `USERS_DATABASE_URL=./users.db` (это значения по умолчанию). Используйте обычные пути, без префикса `file:`.
4. Создать таблицы обеих баз: `npm run db:migrate`.
5. Собрать и запустить бота: `npm run build`, затем `npm start`.

После изменения моделей новые миграции обеих баз создаются командой `npm run db:generate`.
Проверка сборки, репозиториев и FSRS на временных SQLite-файлах: `npm test`.
Устройство подключений, связи и миграции описаны в [docs/databases.md](docs/databases.md).

Репозитории для всех моделей находятся в `src/db/repositories`; каталог функций,
контракты и примеры использования — в [docs/repositories.md](docs/repositories.md).

Ядро обучения карточек использует FSRS 6 через TS-FSRS. Очередь учитывает шаги
заучивания, риск забывания, просрочку, дневные лимиты и разные колоды.
API, настройки и алгоритм выбора описаны в [docs/fsrs.md](docs/fsrs.md).
Грамматика работает отдельно от FSRS.

`createdAt` и `updatedAt` хранятся как `TEXT`. Для `createdAt` база задаёт `CURRENT_TIMESTAMP` в UTC. Drizzle заполняет `updatedAt` при вставке и обновлении, если значение не передано явно. Это механизм ORM (`$onUpdate`), а не SQL-триггер: при прямых SQL-запросах `updatedAt` нужно поддерживать самостоятельно.
Даты повторений (`due`, `lastReview`, `review`, `lastReviewedAt`) используют `INTEGER` с режимом `timestamp_ms`: в TypeScript это `Date`, в базе — миллисекунды Unix. Индексы и правила удаления сохранены. Внутренние внешние ключи включены при подключении; связи между файлами проверяются TEMP-триггерами общего подключения.

У каждой SQLite-базы свои схема и история миграций.

Оценка индексов, связей и ограничений моделей описана в [docs/database-design.md](docs/database-design.md).
Ограничения FSRS и составной внешний ключ журнала обеспечивают согласованность прогресса и истории в `users.db`.
При сохранении `ReviewLog` передавайте `lastElapsedDays` и `learningSteps`: оба поля обязательны.

Грамматические правила состоят из разделов, примеров, блоков основной информации и изображений. Порядок материалов задаётся полем `order`; при чтении сортируйте по `order`, затем по `id`. У дочерних элементов `order` по умолчанию равен `0`. Поле изображения в TypeScript — `imageUrl`.
Пользователь может хранить одну личную заметку на каждое правило (`userRuleComment`) в `users.db`. Материалы грамматики находятся в `content.db` и создаются вместе с его схемой через `npm run db:migrate`.

Использованная официальная документация: [типы SQLite](https://orm.drizzle.team/docs/sqlite/column-types), [индексы и ограничения](https://orm.drizzle.team/docs/sqlite/indexes-constraints), [драйвер Node SQLite](https://orm.drizzle.team/docs/sqlite/connect-node-sqlite), [настройка Drizzle Kit](https://orm.drizzle.team/docs/drizzle-config-file).
