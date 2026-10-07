import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
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

    order: integer("order").notNull().default(0),

    imageUrl: text("image_url").notNull(),
  },
  (table) => [
    index("rule_images_rule_order_idx").on(table.ruleId, table.order),
    check(
      "rule_image_order_check",
      sql`typeof(${table.order}) = 'integer' AND ${table.order} >= 0`,
    ),
  ],
);
