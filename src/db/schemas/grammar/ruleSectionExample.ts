import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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

    example: text("example").notNull(),

    exampleTranslation: text("example_translation").notNull(),
  },
  (table) => [
    index("rule_section_example_rule_section_id_index").on(table.ruleSectionId),
  ],
);
