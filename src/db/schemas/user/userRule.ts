import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { userTable } from "./user";
import { ruleTable } from "../grammar/rule";

export const userRuleTable = sqliteTable(
  "user_rule",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    ruleId: integer("rule_id")
      .notNull()
      .references(() => ruleTable.id, {
        onDelete: "cascade",
      }),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("user_rule_unique").on(table.userId, table.ruleId),
    index("user_rules_rule_idx").on(table.ruleId),
  ],
);
