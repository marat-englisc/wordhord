import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ruleTable } from "./rule";

export const ruleImageTable = sqliteTable(
  "rule_image",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    ruleId: integer("rule_id")
      .notNull()
      .references(() => ruleTable.id, {
        onDelete: "cascade",
      }),

    image_url: text("image_url").notNull(),
  },
  (table) => [index("rule_image_rule_id_index").on(table.ruleId)],
);
