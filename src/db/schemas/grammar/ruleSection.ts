import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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

    title: text("title").notNull(),

    content: text("content").notNull(),
  },
  (table) => [index("rule_section_rule_id_index").on(table.ruleId)],
);
