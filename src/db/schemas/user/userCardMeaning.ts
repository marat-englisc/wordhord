import { sql } from "drizzle-orm";
import type { State } from "ts-fsrs";
import {
  check,
  index,
  integer,
  sqliteTable,
  real,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { userTable } from "./user";

export const userCardMeaningTable = sqliteTable(
  "user_card_meaning",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),

    cardMeaningId: integer("card_meaning_id").notNull(),

    due: integer("due", { mode: "timestamp_ms" }).notNull(),

    stability: real("stability").notNull(),

    difficulty: real("difficulty").notNull(),

    elapsedDays: integer("elapsed_days").notNull(),

    scheduledDays: integer("scheduled_days").notNull(),

    learningSteps: integer("learning_steps").notNull(),

    reps: integer("reps").notNull(),

    lapses: integer("lapses").notNull(),

    state: integer("state").$type<State>().notNull(),

    lastReview: integer("last_review", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("user_card_meaning_unique").on(
      table.userId,
      table.cardMeaningId,
    ),

    index("user_card_meanings_due_idx").on(table.userId, table.due),
    index("user_card_meanings_card_meaning_idx").on(table.cardMeaningId),

    unique("user_card_meaning_identity_unique").on(
      table.id,
      table.userId,
      table.cardMeaningId,
    ),

    check("user_card_meaning_state_check", sql`${table.state} IN (0, 1, 2, 3)`),
    check(
      "user_card_meaning_stability_check",
      sql`typeof(${table.stability}) IN ('integer', 'real') AND ${table.stability} BETWEEN 0 AND 1.7976931348623157e308`,
    ),
    check(
      "user_card_meaning_difficulty_check",
      sql`typeof(${table.difficulty}) IN ('integer', 'real') AND ${table.difficulty} BETWEEN 0 AND 10`,
    ),
    check(
      "user_card_meaning_counters_check",
      sql`typeof(${table.elapsedDays}) = 'integer' AND ${table.elapsedDays} BETWEEN 0 AND 9007199254740991
        AND typeof(${table.scheduledDays}) = 'integer' AND ${table.scheduledDays} BETWEEN 0 AND 9007199254740991
        AND typeof(${table.learningSteps}) = 'integer' AND ${table.learningSteps} BETWEEN 0 AND 9007199254740991
        AND typeof(${table.reps}) = 'integer' AND ${table.reps} BETWEEN 0 AND 9007199254740991
        AND typeof(${table.lapses}) = 'integer' AND ${table.lapses} BETWEEN 0 AND 9007199254740991`,
    ),
    check(
      "user_card_meaning_dates_check",
      sql`typeof(${table.due}) = 'integer' AND ${table.due} BETWEEN -8640000000000000 AND 8640000000000000
        AND (${table.lastReview} IS NULL OR (typeof(${table.lastReview}) = 'integer'
          AND ${table.lastReview} BETWEEN -8640000000000000 AND 8640000000000000))`,
    ),
  ],
);
