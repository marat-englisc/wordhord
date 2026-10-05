import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const attributeTable = pgTable("attribute", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),

  name: varchar("name", { length: 255 }).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull(),
});
