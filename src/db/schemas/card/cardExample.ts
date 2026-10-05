import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { cardMeaningTable } from "./cardMeaning";

export const cardExampleTable = pgTable(
  "card_example",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    cardMeaningId: integer("card_meaning_id")
      .notNull()
      .references(() => cardMeaningTable.id, {
        onDelete: "cascade",
      }),

    example: text("example").notNull(),

    exampleTranslation: text("example_translation").notNull(),
  },
  (table) => [
    index("card_examples_card_meaning_id_index").on(table.cardMeaningId),
  ],
);
