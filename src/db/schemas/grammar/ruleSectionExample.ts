import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { ruleSectionTable } from "./ruleSection";

export const ruleSectionExampleTable = sqliteTable(
  "rule_section_example",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    ruleSectionId: integer("rule_section_id")
      .notNull()
      .references(() => ruleSectionTable.id, {
        onDelete: "cascade",
      }),

    order: integer("order").notNull().default(0),

    example: text("example").notNull(),

    exampleTranslation: text("example_translation").notNull(),
  },
  (table) => [
    index("rule_section_examples_section_order_idx").on(
      table.ruleSectionId,
      table.order,
    ),
    check(
      "rule_section_example_order_check",
      sql`typeof(${table.order}) = 'integer' AND ${table.order} >= 0`,
    ),
  ],
);
