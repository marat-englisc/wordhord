import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { ruleSectionTable } from "./ruleSection";

export const ruleSectionPrimaryInfoTable = sqliteTable(
  "rule_section_primary_info",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    ruleSectionId: integer("rule_section_id")
      .notNull()
      .references(() => ruleSectionTable.id, {
        onDelete: "cascade",
      }),

    order: integer("order").notNull().default(0),

    content: text("content").notNull(),
  },
  (table) => [
    index("rule_section_primary_info_section_order_idx").on(
      table.ruleSectionId,
      table.order,
    ),
    check(
      "rule_section_primary_info_order_check",
      sql`typeof(${table.order}) = 'integer' AND ${table.order} >= 0`,
    ),
  ],
);
