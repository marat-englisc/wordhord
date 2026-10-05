import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { deckTable } from "./deck";

export const cardTable = pgTable(
  "card",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    deckId: integer("deck_id")
      .notNull()
      .references(() => deckTable.id, {
        onDelete: "restrict",
      }),

    title: text("title").notNull(),

    transcription: text("transcription"),

    audioUrl: text("audio_url"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("cards_deck_id_index").on(table.deckId)],
);
