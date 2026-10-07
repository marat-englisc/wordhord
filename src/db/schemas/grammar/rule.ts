import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const ruleTable = sqliteTable(
  "rule",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    order: integer("order").notNull(),

    name: text("name").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("rules_order_idx").on(table.order),
    check(
      "rule_order_check",
      sql`typeof(${table.order}) = 'integer' AND ${table.order} >= 0`,
    ),
  ],
);
