import {
  and,
  asc,
  count,
  eq,
  getColumns,
  gte,
  lte,
  notExists,
  sql,
} from "drizzle-orm";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { cardTable } from "../../schemas/card/card";
import type { State } from "ts-fsrs";
import { userCardMeaningTable } from "../../schemas/user/userCardMeaning";
import { db } from "../../../config/db";
import {
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type UserCardMeaning = typeof userCardMeaningTable.$inferSelect;
export type NewUserCardMeaning = Omit<
  typeof userCardMeaningTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserCardMeaning = Partial<
  Omit<NewUserCardMeaning, "userId" | "cardMeaningId">
>;

export interface UserCardMeaningFilters {
  userId?: number;
  cardMeaningId?: number;
  state?: State;
  dueBefore?: Date;
  dueAfter?: Date;
}

export type UserCardMeaningQuery = UserCardMeaningFilters & PaginationOptions;

function getUserCardMeaningConditions(filters: UserCardMeaningFilters) {
  return and(
    filters.userId !== undefined
      ? eq(userCardMeaningTable.userId, filters.userId)
      : undefined,
    filters.cardMeaningId !== undefined
      ? eq(userCardMeaningTable.cardMeaningId, filters.cardMeaningId)
      : undefined,
    filters.state !== undefined
      ? eq(userCardMeaningTable.state, filters.state)
      : undefined,
    filters.dueBefore !== undefined
      ? lte(userCardMeaningTable.due, filters.dueBefore)
      : undefined,
    filters.dueAfter !== undefined
      ? gte(userCardMeaningTable.due, filters.dueAfter)
      : undefined,
  );
}

export async function getUserCardMeaningById(id: number) {
  try {
    const rows = await db
      .select()
      .from(userCardMeaningTable)
      .where(eq(userCardMeaningTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userCardMeaning by ID:", error);
    throw error;
  }
}

export async function getUserCardMeanings(options: UserCardMeaningQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(userCardMeaningTable)
      .where(getUserCardMeaningConditions(options))
      .orderBy(asc(userCardMeaningTable.due), asc(userCardMeaningTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching UserCardMeanings:", error);
    throw error;
  }
}

export async function countUserCardMeanings(
  filters: UserCardMeaningFilters = {},
) {
  try {
    return await db.$count(
      userCardMeaningTable,
      getUserCardMeaningConditions(filters),
    );
  } catch (error) {
    console.error("Error counting UserCardMeanings:", error);
    throw error;
  }
}

export async function createUserCardMeaning(
  data: NewUserCardMeaning,
): Promise<UserCardMeaning> {
  try {
    const rows = await db.insert(userCardMeaningTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating userCardMeaning:", error);
    throw error;
  }
}

export async function updateUserCardMeaning(
  id: number,
  data: UpdateUserCardMeaning,
) {
  try {
    validateUpdate(data, ["userId", "cardMeaningId"]);
    const rows = await db
      .update(userCardMeaningTable)
      .set(data)
      .where(eq(userCardMeaningTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating userCardMeaning:", error);
    throw error;
  }
}

export async function deleteUserCardMeaning(id: number) {
  try {
    const rows = await db
      .delete(userCardMeaningTable)
      .where(eq(userCardMeaningTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userCardMeaning:", error);
    throw error;
  }
}

export async function getUserCardMeaningByUserAndCardMeaning(
  userId: number,
  cardMeaningId: number,
) {
  try {
    const rows = await db
      .select()
      .from(userCardMeaningTable)
      .where(
        and(
          eq(userCardMeaningTable.userId, userId),
          eq(userCardMeaningTable.cardMeaningId, cardMeaningId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userCardMeaning by relation:", error);
    throw error;
  }
}

export async function getOrCreateUserCardMeaning(
  data: NewUserCardMeaning,
): Promise<UserCardMeaning> {
  try {
    return db.transaction((tx) => {
      const inserted = tx
        .insert(userCardMeaningTable)
        .values(data)
        .onConflictDoNothing({
          target: [
            userCardMeaningTable.userId,
            userCardMeaningTable.cardMeaningId,
          ],
        })
        .returning()
        .get();
      if (inserted) return inserted;

      return tx
        .select()
        .from(userCardMeaningTable)
        .where(
          and(
            eq(userCardMeaningTable.userId, data.userId),
            eq(userCardMeaningTable.cardMeaningId, data.cardMeaningId),
          ),
        )
        .get()!;
    });
  } catch (error) {
    console.error("Error getting or creating userCardMeaning:", error);
    throw error;
  }
}

export async function deleteUserCardMeaningByUserAndCardMeaning(
  userId: number,
  cardMeaningId: number,
) {
  try {
    const rows = await db
      .delete(userCardMeaningTable)
      .where(
        and(
          eq(userCardMeaningTable.userId, userId),
          eq(userCardMeaningTable.cardMeaningId, cardMeaningId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userCardMeaning by relation:", error);
    throw error;
  }
}

export type DueUserCardMeaningQuery = PaginationOptions & {
  deckId?: number;
  state?: State;
};

export async function getDueUserCardMeanings(
  userId: number,
  dueBefore: Date = new Date(),
  options: DueUserCardMeaningQuery = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select(getColumns(userCardMeaningTable))
      .from(userCardMeaningTable)
      .innerJoin(
        cardMeaningTable,
        eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
      )
      .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
      .where(
        and(
          eq(userCardMeaningTable.userId, userId),
          lte(userCardMeaningTable.due, dueBefore),
          options.deckId !== undefined
            ? eq(cardTable.deckId, options.deckId)
            : undefined,
          options.state !== undefined
            ? eq(userCardMeaningTable.state, options.state)
            : undefined,
        ),
      )
      .orderBy(asc(userCardMeaningTable.due), asc(userCardMeaningTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching due user card meanings:", error);
    throw error;
  }
}

export async function getUnstudiedCardMeanings(
  userId: number,
  deckId: number,
  options: PaginationOptions = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select(getColumns(cardMeaningTable))
      .from(cardMeaningTable)
      .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
      .where(
        and(
          eq(cardTable.deckId, deckId),
          notExists(
            db
              .select({ id: userCardMeaningTable.id })
              .from(userCardMeaningTable)
              .where(
                and(
                  eq(userCardMeaningTable.userId, userId),
                  eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(cardMeaningTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching unstudied card meanings:", error);
    throw error;
  }
}

export async function getUserCardMeaningStatistics(
  userId: number,
  asOf: Date = new Date(),
) {
  try {
    return await db
      .select({
        state: userCardMeaningTable.state,
        total: count(),
        due: sql<number>`sum(case when ${lte(userCardMeaningTable.due, asOf)} then 1 else 0 end)`.mapWith(
          Number,
        ),
      })
      .from(userCardMeaningTable)
      .where(eq(userCardMeaningTable.userId, userId))
      .groupBy(userCardMeaningTable.state)
      .orderBy(asc(userCardMeaningTable.state));
  } catch (error) {
    console.error("Error fetching user card meaning statistics:", error);
    throw error;
  }
}
