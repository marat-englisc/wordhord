import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { cardTable } from "./card";

export const cardMeaningTable = pgTable(
  "card_meaning",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    cardId: integer("card_id")
      .notNull()
      .references(() => cardTable.id, {
        onDelete: "cascade",
      }),

    hint: text("hint"),

    meaning: text("meaning").notNull(),

    meaningTranslation: text("meaning_translation").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("card_meanings_card_id_index").on(table.cardId)],
);
