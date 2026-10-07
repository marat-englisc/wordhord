import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { ruleTable } from "./rule";

export const ruleSectionTable = sqliteTable(
  "rule_section",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    ruleId: integer("rule_id")
      .notNull()
      .references(() => ruleTable.id, {
        onDelete: "cascade",
      }),

    order: integer("order").notNull().default(0),

    title: text("title").notNull(),

    content: text("content").notNull(),
  },
  (table) => [
    index("rule_sections_rule_order_idx").on(table.ruleId, table.order),
    check(
      "rule_section_order_check",
      sql`typeof(${table.order}) = 'integer' AND ${table.order} >= 0`,
    ),
  ],
);
