import { and, asc, eq, or } from "drizzle-orm";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type CardMeaning = typeof cardMeaningTable.$inferSelect;
export type NewCardMeaning = Omit<
  typeof cardMeaningTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCardMeaning = Partial<NewCardMeaning>;

export interface CardMeaningFilters {
  cardId?: number;
  search?: string;
}

export type CardMeaningQuery = CardMeaningFilters & PaginationOptions;

function getCardMeaningConditions(filters: CardMeaningFilters) {
  return and(
    filters.cardId !== undefined
      ? eq(cardMeaningTable.cardId, filters.cardId)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(cardMeaningTable.meaning, filters.search),
          containsText(cardMeaningTable.meaningTranslation, filters.search),
          containsText(cardMeaningTable.hint, filters.search),
        )
      : undefined,
  );
}

export async function getCardMeaningById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(cardMeaningTable)
    .where(eq(cardMeaningTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCardMeanings(options: CardMeaningQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(cardMeaningTable)
    .where(getCardMeaningConditions(options))
    .orderBy(asc(cardMeaningTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countCardMeanings(filters: CardMeaningFilters = {}) {
  return await getDatabase().$count(cardMeaningTable, getCardMeaningConditions(filters));
}

export async function createCardMeaning(
  data: NewCardMeaning,
): Promise<CardMeaning> {
  const rows = await getDatabase().insert(cardMeaningTable).values(data).returning();
  return rows[0]!;
}

export async function createCardMeanings(
  data: NewCardMeaning[],
): Promise<CardMeaning[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) => tx.insert(cardMeaningTable).values(item).returning().get()!,
    ),
  );
}

export async function updateCardMeaning(id: number, data: UpdateCardMeaning) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(cardMeaningTable)
    .set(data)
    .where(eq(cardMeaningTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCardMeaning(id: number) {
  const rows = await getDatabase()
    .delete(cardMeaningTable)
    .where(eq(cardMeaningTable.id, id))
    .returning();
  return rows[0] ?? null;
}
