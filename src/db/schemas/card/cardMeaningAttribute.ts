import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { attributeTable } from "./attribute";
import { cardMeaningTable } from "./cardMeaning";

export const cardMeaningAttributeTable = pgTable(
  "card_meaning_attribute",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),

    cardMeaningId: integer("card_meaning_id")
      .notNull()
      .references(() => cardMeaningTable.id, {
        onDelete: "cascade",
      }),

    attributeId: integer("attribute_id")
      .notNull()
      .references(() => attributeTable.id, {
        onDelete: "cascade",
      }),

    value: varchar("value", { length: 255 }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    uniqueIndex("card_meaning_attribute_unique").on(
      table.cardMeaningId,
      table.attributeId,
      table.value,
    ),
  ],
);
