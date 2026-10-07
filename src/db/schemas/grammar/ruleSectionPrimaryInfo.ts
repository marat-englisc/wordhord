import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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

    content: text("content").notNull(),
  },
  (table) => [
    index("rule_section_primary_info_rule_section_id_index").on(
      table.ruleSectionId,
    ),
  ],
);
