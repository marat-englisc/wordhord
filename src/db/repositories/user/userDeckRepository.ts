import { and, asc, eq, getColumns } from "drizzle-orm";
import { deckTable } from "../../schemas/card/deck";
import { userDeckTable } from "../../schemas/user/userDeck";
import { getDatabase } from "../../../config/db";
import { optionalDateWrite, validateDateWrite } from "../persistenceValidation";
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
  const rows = await getDatabase()
    .select()
    .from(userDeckTable)
    .where(eq(userDeckTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserDecks(options: UserDeckQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userDeckTable)
    .where(getUserDeckConditions(options))
    .orderBy(asc(userDeckTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countUserDecks(filters: UserDeckFilters = {}) {
  return await getDatabase().$count(userDeckTable, getUserDeckConditions(filters));
}

export async function createUserDeck(data: NewUserDeck): Promise<UserDeck> {
  optionalDateWrite(data.lastReviewedAt, "lastReviewedAt");
  const rows = await getDatabase().insert(userDeckTable).values(data).returning();
  return rows[0]!;
}

export async function updateUserDeck(id: number, data: UpdateUserDeck) {
  validateUpdate(data, ["userId", "deckId"]);
  optionalDateWrite(data.lastReviewedAt, "lastReviewedAt");
  const rows = await getDatabase()
    .update(userDeckTable)
    .set(data)
    .where(eq(userDeckTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteUserDeck(id: number) {
  const rows = await getDatabase()
    .delete(userDeckTable)
    .where(eq(userDeckTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getUserDeckByUserAndDeck(userId: number, deckId: number) {
  const rows = await getDatabase()
    .select()
    .from(userDeckTable)
    .where(
      and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrCreateUserDeck(
  data: NewUserDeck,
): Promise<UserDeck> {
  optionalDateWrite(data.lastReviewedAt, "lastReviewedAt");
  return getDatabase().transaction((tx) => {
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
}

export async function deleteUserDeckByUserAndDeck(
  userId: number,
  deckId: number,
) {
  const rows = await getDatabase()
    .delete(userDeckTable)
    .where(
      and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
    )
    .returning();
  return rows[0] ?? null;
}

export async function getDecksForUser(
  userId: number,
  options: PaginationOptions = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
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
}

export async function markUserDeckReviewed(
  userId: number,
  deckId: number,
  reviewedAt: Date = new Date(),
) {
  validateDateWrite(reviewedAt, "reviewedAt");
  const rows = await getDatabase()
    .update(userDeckTable)
    .set({ lastReviewedAt: reviewedAt })
    .where(
      and(eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, deckId)),
    )
    .returning();
  return rows[0] ?? null;
}
