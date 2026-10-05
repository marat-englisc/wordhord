import {
  bigint,
  integer,
  pgTable,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull().unique(),

  username: varchar("username", { length: 255 }),

  firstName: varchar("first_name", { length: 255 }),

  lastName: varchar("last_name", { length: 255 }),

  isAdmin: boolean("is_admin").notNull().default(false),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull(),
});
