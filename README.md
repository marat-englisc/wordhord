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

`createdAt` и `updatedAt` хранятся как `TEXT`. Для `createdAt` база задаёт `CURRENT_TIMESTAMP` в UTC. Drizzle заполняет `updatedAt` при вставке и обновлении, если значение не передано явно. Это механизм ORM (`$onUpdate`), а не SQL-триггер: при прямых SQL-запросах `updatedAt` нужно поддерживать самостоятельно.
Даты повторений (`due`, `lastReview`, `review`, `lastReviewedAt`) используют `INTEGER` с режимом `timestamp_ms`: в TypeScript это `Date`, в базе — миллисекунды Unix. Связи, правила удаления и индексы сохранены; внешние ключи включены при подключении.

Миграция создаёт схему для новой SQLite-базы. Перенос данных из существующей PostgreSQL-базы выполняется отдельно.

Оценка индексов, связей и ограничений моделей описана в [docs/database-design.md](docs/database-design.md).
Миграция `model_integrity_and_indexes` обновляет существующую SQLite-схему с сохранением данных. Если старые записи нарушают новые ограничения FSRS или согласованность журнала, она откатывается; такие записи нужно исправить перед повторным запуском.
При сохранении нового `ReviewLog` передавайте также `lastElapsedDays` и `learningSteps`. У старых записей эти поля остаются `NULL`, поскольку раньше они не сохранялись.

Грамматические правила состоят из разделов, примеров, блоков основной информации и изображений. Порядок материалов задаётся полем `order`; при чтении сортируйте по `order`, затем по `id`. У дочерних элементов `order` по умолчанию равен `0`. Поле изображения в TypeScript — `imageUrl`.
Пользователь может хранить одну личную заметку на каждое правило (`userRuleComment`). Таблицы грамматики создаются миграцией `grammar_models`, применяемой той же командой `npm run db:migrate`.

Использованная официальная документация: [типы SQLite](https://orm.drizzle.team/docs/sqlite/column-types), [индексы и ограничения](https://orm.drizzle.team/docs/sqlite/indexes-constraints), [драйвер Node SQLite](https://orm.drizzle.team/docs/sqlite/connect-node-sqlite), [настройка Drizzle Kit](https://orm.drizzle.team/docs/drizzle-config-file).
