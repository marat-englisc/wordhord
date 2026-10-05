import { integer, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { deckTable } from "../card/deck";

export const userDeckTable = pgTable(
  "user_deck",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    deckId: integer("deck_id")
      .notNull()
      .references(() => deckTable.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    lastReviewedAt: timestamp("last_reviewed_at", {
      withTimezone: true,
    }),
  },
  (table) => [uniqueIndex("user_deck_unique").on(table.userId, table.deckId)],
);
