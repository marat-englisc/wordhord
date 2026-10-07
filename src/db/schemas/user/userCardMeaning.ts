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
import { cardMeaningTable } from "../card/cardMeaning";

export const userCardMeaningTable = sqliteTable(
  "user_card_meaning",
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

    // SQLite requires a matching UNIQUE key for the review's composite foreign key.
    unique("user_card_meaning_identity_unique").on(
      table.id,
      table.userId,
      table.cardMeaningId,
    ),

    check("user_card_meaning_state_check", sql`${table.state} IN (0, 1, 2, 3)`),
    check(
      "user_card_meaning_stability_check",
      sql`typeof(${table.stability}) IN ('integer', 'real') AND ${table.stability} >= 0`,
    ),
    check(
      "user_card_meaning_difficulty_check",
      sql`typeof(${table.difficulty}) IN ('integer', 'real') AND ${table.difficulty} BETWEEN 0 AND 10`,
    ),
    check(
      "user_card_meaning_counters_check",
      sql`typeof(${table.elapsedDays}) = 'integer' AND ${table.elapsedDays} >= 0
        AND typeof(${table.scheduledDays}) = 'integer' AND ${table.scheduledDays} >= 0
        AND typeof(${table.learningSteps}) = 'integer' AND ${table.learningSteps} >= 0
        AND typeof(${table.reps}) = 'integer' AND ${table.reps} >= 0
        AND typeof(${table.lapses}) = 'integer' AND ${table.lapses} >= 0`,
    ),
  ],
);
