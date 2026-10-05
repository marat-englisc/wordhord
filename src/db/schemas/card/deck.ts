import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const deckTable = pgTable("deck", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  name: varchar("name", { length: 255 }).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull(),
});
