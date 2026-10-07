import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { userTable } from "./user";
import { sql } from "drizzle-orm";

export const userRuleCommentTable = sqliteTable(
  "user_rule_comment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    ruleId: integer("rule_id").notNull(),

    comment: text("comment").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("user_rule_comment_unique").on(table.userId, table.ruleId),
    index("user_rule_comments_rule_idx").on(table.ruleId),
  ],
);
