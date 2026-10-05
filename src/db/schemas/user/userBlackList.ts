import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { cardMeaningTable } from "../card/cardMeaning";

export const userBlackListTable = pgTable("user_black_list", {
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

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
