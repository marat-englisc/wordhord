import { index, integer, sqliteTable, real } from "drizzle-orm/sqlite-core";
import { userTable } from "./user";
import { userCardMeaningTable } from "./userCardMeaning";
import { cardMeaningTable } from "../card/cardMeaning";

export const userCardMeaningReviewTable = sqliteTable(
  "user_card_meaning_review",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    cardMeaningId: integer("card_meaning_id")
      .notNull()
      .references(() => cardMeaningTable.id, {
        onDelete: "cascade",
      }),

    userCardMeaningId: integer("user_card_meaning_id")
      .notNull()
      .references(() => userCardMeaningTable.id, {
        onDelete: "cascade",
      }),

    rating: integer("rating").notNull(),

    state: integer("state").notNull(),

    due: integer("due", { mode: "timestamp_ms" }).notNull(),

    stability: real("stability").notNull(),

    difficulty: real("difficulty").notNull(),

    scheduledDays: integer("scheduled_days").notNull(),

    elapsedDays: integer("elapsed_days").notNull(),

    review: integer("review", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("user_card_meaning_reviews_user_idx").on(table.userId, table.review),
  ],
);
