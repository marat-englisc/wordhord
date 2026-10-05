import {
  index,
  integer,
  pgTable,
  real,
  smallint,
  timestamp,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { userCardMeaningTable } from "./userCardMeaning";
import { cardMeaningTable } from "../card/cardMeaning";

export const userCardMeaningReviewTable = pgTable(
  "user_card_meaning_review",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

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

    rating: smallint("rating").notNull(),

    state: smallint("state").notNull(),

    due: timestamp("due", {
      withTimezone: true,
    }).notNull(),

    stability: real("stability").notNull(),

    difficulty: real("difficulty").notNull(),

    scheduledDays: integer("scheduled_days").notNull(),

    elapsedDays: integer("elapsed_days").notNull(),

    review: timestamp("review", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index("user_card_meaning_reviews_user_idx").on(table.userId, table.review),
  ],
);
