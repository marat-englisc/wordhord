import { sql } from "drizzle-orm";
import type { Rating, State } from "ts-fsrs";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  real,
} from "drizzle-orm/sqlite-core";
import { userCardMeaningTable } from "./userCardMeaning";

export const userCardMeaningReviewTable = sqliteTable(
  "user_card_meaning_review",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id").notNull(),

    cardMeaningId: integer("card_meaning_id").notNull(),

    userCardMeaningId: integer("user_card_meaning_id").notNull(),

    rating: integer("rating").$type<Rating>().notNull(),

    state: integer("state").$type<State>().notNull(),

    due: integer("due", { mode: "timestamp_ms" }).notNull(),

    stability: real("stability").notNull(),

    difficulty: real("difficulty").notNull(),

    scheduledDays: integer("scheduled_days").notNull(),

    elapsedDays: integer("elapsed_days").notNull(),

    // Historical logs did not store these values; NULL preserves that distinction.
    lastElapsedDays: integer("last_elapsed_days"),

    learningSteps: integer("learning_steps"),

    review: integer("review", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("user_card_meaning_reviews_user_idx").on(table.userId, table.review),
    index("user_card_meaning_reviews_progress_idx").on(
      table.userCardMeaningId,
      table.review,
    ),
    foreignKey({
      name: "user_card_meaning_review_progress_fk",
      columns: [table.userCardMeaningId, table.userId, table.cardMeaningId],
      foreignColumns: [
        userCardMeaningTable.id,
        userCardMeaningTable.userId,
        userCardMeaningTable.cardMeaningId,
      ],
    }).onDelete("cascade"),

    check(
      "user_card_meaning_review_rating_check",
      sql`${table.rating} IN (0, 1, 2, 3, 4)`,
    ),
    check(
      "user_card_meaning_review_state_check",
      sql`${table.state} IN (0, 1, 2, 3)`,
    ),
    check(
      "user_card_meaning_review_stability_check",
      sql`typeof(${table.stability}) IN ('integer', 'real') AND ${table.stability} >= 0`,
    ),
    check(
      "user_card_meaning_review_difficulty_check",
      sql`typeof(${table.difficulty}) IN ('integer', 'real') AND ${table.difficulty} BETWEEN 0 AND 10`,
    ),
    check(
      "user_card_meaning_review_counters_check",
      sql`typeof(${table.elapsedDays}) = 'integer' AND ${table.elapsedDays} >= 0
        AND typeof(${table.scheduledDays}) = 'integer' AND ${table.scheduledDays} >= 0
        AND (${table.lastElapsedDays} IS NULL OR (
          typeof(${table.lastElapsedDays}) = 'integer' AND ${table.lastElapsedDays} >= 0
        ))
        AND (${table.learningSteps} IS NULL OR (
          typeof(${table.learningSteps}) = 'integer' AND ${table.learningSteps} >= 0
        ))`,
    ),
  ],
);
