import { and, asc, eq, or } from "drizzle-orm";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { db } from "../../../config/db";
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
  try {
    const rows = await db
      .select()
      .from(cardMeaningTable)
      .where(eq(cardMeaningTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching cardMeaning by ID:", error);
    throw error;
  }
}

export async function getCardMeanings(options: CardMeaningQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(cardMeaningTable)
      .where(getCardMeaningConditions(options))
      .orderBy(asc(cardMeaningTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching CardMeanings:", error);
    throw error;
  }
}

export async function countCardMeanings(filters: CardMeaningFilters = {}) {
  try {
    return await db.$count(cardMeaningTable, getCardMeaningConditions(filters));
  } catch (error) {
    console.error("Error counting CardMeanings:", error);
    throw error;
  }
}

export async function createCardMeaning(
  data: NewCardMeaning,
): Promise<CardMeaning> {
  try {
    const rows = await db.insert(cardMeaningTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating cardMeaning:", error);
    throw error;
  }
}

export async function createCardMeanings(
  data: NewCardMeaning[],
): Promise<CardMeaning[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) => tx.insert(cardMeaningTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating CardMeanings:", error);
    throw error;
  }
}

export async function updateCardMeaning(id: number, data: UpdateCardMeaning) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(cardMeaningTable)
      .set(data)
      .where(eq(cardMeaningTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating cardMeaning:", error);
    throw error;
  }
}

export async function deleteCardMeaning(id: number) {
  try {
    const rows = await db
      .delete(cardMeaningTable)
      .where(eq(cardMeaningTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting cardMeaning:", error);
    throw error;
  }
}
