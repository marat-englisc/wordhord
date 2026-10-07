import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { userTable } from "./user";

export const userDeckTable = sqliteTable(
  "user_deck",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    deckId: integer("deck_id").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),

    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("user_deck_unique").on(table.userId, table.deckId),
    index("user_decks_deck_idx").on(table.deckId),
    check(
      "user_deck_last_reviewed_at_check",
      sql`${table.lastReviewedAt} IS NULL OR (typeof(${table.lastReviewedAt}) = 'integer'
        AND ${table.lastReviewedAt} BETWEEN -8640000000000000 AND 8640000000000000)`,
    ),
  ],
);
