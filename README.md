# wordhord

Telegram-бот для изучения английского языка. Все модели используют SQLite и Drizzle ORM.

Требуется Node.js 24 или новее: подключение работает через встроенный `node:sqlite`.

1. Установить зависимости: `npm install`.
2. Скопировать `.env.example` в `.env` и задать `TELEGRAM_TOKEN`.
3. В `DATABASE_URL` указать путь к файлу SQLite, например `./wordhord.db` (это также значение по умолчанию). Используйте обычный путь, без префикса `file:`.
4. Создать таблицы: `npm run db:migrate`.
5. Собрать и запустить бота: `npm run build`, затем `npm start`.

После изменения моделей новые миграции создаются командой `npm run db:generate`.
Проверка сборки и моделей на SQLite в памяти: `npm test`.

`createdAt` и `updatedAt` хранятся как `TEXT`, как в модели `user`. Для `createdAt` база задаёт `CURRENT_TIMESTAMP` в UTC. В остальных моделях `updatedAt` по-прежнему нужно передавать явно; SQLite не обновляет его автоматически.
Даты повторений (`due`, `lastReview`, `review`, `lastReviewedAt`) используют `INTEGER` с режимом `timestamp_ms`: в TypeScript это `Date`, в базе — миллисекунды Unix. Связи, правила удаления и индексы сохранены; внешние ключи включены при подключении.

Миграция создаёт схему для новой SQLite-базы. Перенос данных из существующей PostgreSQL-базы выполняется отдельно.

Использованная официальная документация: [типы SQLite](https://orm.drizzle.team/docs/sqlite/column-types), [индексы и ограничения](https://orm.drizzle.team/docs/sqlite/indexes-constraints), [драйвер Node SQLite](https://orm.drizzle.team/docs/sqlite/connect-node-sqlite), [настройка Drizzle Kit](https://orm.drizzle.team/docs/drizzle-config-file).
