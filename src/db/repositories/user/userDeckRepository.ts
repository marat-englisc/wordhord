import { and, asc, eq, getColumns } from "drizzle-orm";
import { deckTable } from "../../schemas/card/deck";
import { userDeckTable } from "../../schemas/user/userDeck";
import { db } from "../../../config/db";
import {
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type UserDeck = typeof userDeckTable.$inferSelect;
export type NewUserDeck = Omit<
  typeof userDeckTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserDeck = Partial<Omit<NewUserDeck, "userId" | "deckId">>;

export interface UserDeckFilters {
  userId?: number;
  deckId?: number;
}

export type UserDeckQuery = UserDeckFilters & PaginationOptions;

function getUserDeckConditions(filters: UserDeckFilters) {
  return and(
    filters.userId !== undefined
      ? eq(userDeckTable.userId, filters.userId)
      : undefined,
    filters.deckId !== undefined
      ? eq(userDeckTable.deckId, filters.deckId)
      : undefined,
  );
}

export async function getUserDeckById(id: number) {
  try {
    const rows = await db
      .select()
      .from(userDeckTable)
      .where(eq(userDeckTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userDeck by ID:", error);
    throw error;
  }
}

export async function getUserDecks(options: UserDeckQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(userDeckTable)
      .where(getUserDeckConditions(options))
      .orderBy(asc(userDeckTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching UserDecks:", error);
    throw error;
  }
}

export async function countUserDecks(filters: UserDeckFilters = {}) {
  try {
    return await db.$count(userDeckTable, getUserDeckConditions(filters));
  } catch (error) {
    console.error("Error counting UserDecks:", error);
    throw error;
  }
}

export async function createUserDeck(data: NewUserDeck): Promise<UserDeck> {
  try {
    const rows = await db.insert(userDeckTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating userDeck:", error);
    throw error;
  }
}

export async function updateUserDeck(id: number, data: UpdateUserDeck) {
  try {
    validateUpdate(data, ["userId", "deckId"]);
    const rows = await db
      .update(userDeckTable)
      .set(data)
      .where(eq(userDeckTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating userDeck:", error);
    throw error;
  }
}

export async function deleteUserDeck(id: number) {
  try {
    const rows = await db
      .delete(userDeckTable)
      .where(eq(userDeckTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userDeck:", error);
    throw error;
  }
}

export async function getUserDeckByUserAndDeck(userId: number, deckId: number) {
  try {
    const rows = await db
      .select()
      .from(userDeckTable)
      .where(
        and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userDeck by relation:", error);
    throw error;
  }
}

export async function getOrCreateUserDeck(
  data: NewUserDeck,
): Promise<UserDeck> {
  try {
    return db.transaction((tx) => {
      const inserted = tx
        .insert(userDeckTable)
        .values(data)
        .onConflictDoNothing({
          target: [userDeckTable.userId, userDeckTable.deckId],
        })
        .returning()
        .get();
      if (inserted) return inserted;

      return tx
        .select()
        .from(userDeckTable)
        .where(
          and(
            eq(userDeckTable.userId, data.userId),
            eq(userDeckTable.deckId, data.deckId),
          ),
        )
        .get()!;
    });
  } catch (error) {
    console.error("Error getting or creating userDeck:", error);
    throw error;
  }
}

export async function deleteUserDeckByUserAndDeck(
  userId: number,
  deckId: number,
) {
  try {
    const rows = await db
      .delete(userDeckTable)
      .where(
        and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userDeck by relation:", error);
    throw error;
  }
}

export async function getDecksForUser(
  userId: number,
  options: PaginationOptions = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select({
        deck: getColumns(deckTable),
        subscription: getColumns(userDeckTable),
      })
      .from(userDeckTable)
      .innerJoin(deckTable, eq(userDeckTable.deckId, deckTable.id))
      .where(eq(userDeckTable.userId, userId))
      .orderBy(asc(userDeckTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching decks for user:", error);
    throw error;
  }
}

export async function markUserDeckReviewed(
  userId: number,
  deckId: number,
  reviewedAt: Date = new Date(),
) {
  try {
    const rows = await db
      .update(userDeckTable)
      .set({ lastReviewedAt: reviewedAt })
      .where(
        and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error marking user deck reviewed:", error);
    throw error;
  }
}
