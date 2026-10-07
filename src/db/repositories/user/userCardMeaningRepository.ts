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
import { getDatabase } from "../../../config/db";
import {
  mergeDefinedValues,
  validateProgressWrite,
} from "../persistenceValidation";
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
  const rows = await getDatabase()
    .select()
    .from(userCardMeaningTable)
    .where(eq(userCardMeaningTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserCardMeanings(options: UserCardMeaningQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userCardMeaningTable)
    .where(getUserCardMeaningConditions(options))
    .orderBy(asc(userCardMeaningTable.due), asc(userCardMeaningTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countUserCardMeanings(
  filters: UserCardMeaningFilters = {},
) {
  return await getDatabase().$count(
    userCardMeaningTable,
    getUserCardMeaningConditions(filters),
  );
}

export async function createUserCardMeaning(
  data: NewUserCardMeaning,
): Promise<UserCardMeaning> {
  validateProgressWrite(data);
  const rows = await getDatabase()
    .insert(userCardMeaningTable)
    .values(data)
    .returning();
  return rows[0]!;
}

export async function updateUserCardMeaning(
  id: number,
  data: UpdateUserCardMeaning,
) {
  validateUpdate(data, ["userId", "cardMeaningId"]);
  return getDatabase().transaction((tx) => {
    const existing = tx
      .select()
      .from(userCardMeaningTable)
      .where(eq(userCardMeaningTable.id, id))
      .get();
    if (!existing) return null;
    validateProgressWrite(mergeDefinedValues(existing, data));
    return tx
      .update(userCardMeaningTable)
      .set(data)
      .where(eq(userCardMeaningTable.id, id))
      .returning()
      .get()!;
  }, { behavior: "immediate" });
}

export async function deleteUserCardMeaning(id: number) {
  const rows = await getDatabase()
    .delete(userCardMeaningTable)
    .where(eq(userCardMeaningTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getUserCardMeaningByUserAndCardMeaning(
  userId: number,
  cardMeaningId: number,
) {
  const rows = await getDatabase()
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
}

export async function getOrCreateUserCardMeaning(
  data: NewUserCardMeaning,
): Promise<UserCardMeaning> {
  validateProgressWrite(data);
  return getDatabase().transaction((tx) => {
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
}

export async function deleteUserCardMeaningByUserAndCardMeaning(
  userId: number,
  cardMeaningId: number,
) {
  const rows = await getDatabase()
    .delete(userCardMeaningTable)
    .where(
      and(
        eq(userCardMeaningTable.userId, userId),
        eq(userCardMeaningTable.cardMeaningId, cardMeaningId),
      ),
    )
    .returning();
  return rows[0] ?? null;
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
  const { limit, offset } = getPagination(options);
  return await getDatabase()
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
}

export async function getUnstudiedCardMeanings(
  userId: number,
  deckId: number,
  options: PaginationOptions = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select(getColumns(cardMeaningTable))
    .from(cardMeaningTable)
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(
      and(
        eq(cardTable.deckId, deckId),
        notExists(
          getDatabase()
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
}

export async function getUserCardMeaningStatistics(
  userId: number,
  asOf: Date = new Date(),
) {
  return await getDatabase()
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
}
