import {
  index,
  integer,
  pgTable,
  real,
  smallint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { cardMeaningTable } from "../card/cardMeaning";

export const userCardMeaningTable = pgTable(
  "user_card_meaning",
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

    due: timestamp("due", {
      withTimezone: true,
    }).notNull(),

    stability: real("stability").notNull(),

    difficulty: real("difficulty").notNull(),

    elapsedDays: integer("elapsed_days").notNull(),

    scheduledDays: integer("scheduled_days").notNull(),

    learningSteps: integer("learning_steps").notNull(),

    reps: integer("reps").notNull(),

    lapses: integer("lapses").notNull(),

    state: smallint("state").notNull(),

    lastReview: timestamp("last_review", {
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex("user_card_meaning_unique").on(
      table.userId,
      table.cardMeaningId,
    ),

    index("user_card_meanings_due_idx").on(table.userId, table.due),
  ],
);
