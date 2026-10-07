import { and, asc, eq, or } from "drizzle-orm";
import { cardExampleTable } from "../../schemas/card/cardExample";
import { db } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type CardExample = typeof cardExampleTable.$inferSelect;
export type NewCardExample = Omit<
  typeof cardExampleTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCardExample = Partial<NewCardExample>;

export interface CardExampleFilters {
  cardMeaningId?: number;
  search?: string;
}

export type CardExampleQuery = CardExampleFilters & PaginationOptions;

function getCardExampleConditions(filters: CardExampleFilters) {
  return and(
    filters.cardMeaningId !== undefined
      ? eq(cardExampleTable.cardMeaningId, filters.cardMeaningId)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(cardExampleTable.example, filters.search),
          containsText(cardExampleTable.exampleTranslation, filters.search),
        )
      : undefined,
  );
}

export async function getCardExampleById(id: number) {
  try {
    const rows = await db
      .select()
      .from(cardExampleTable)
      .where(eq(cardExampleTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching cardExample by ID:", error);
    throw error;
  }
}

export async function getCardExamples(options: CardExampleQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(cardExampleTable)
      .where(getCardExampleConditions(options))
      .orderBy(asc(cardExampleTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching CardExamples:", error);
    throw error;
  }
}

export async function countCardExamples(filters: CardExampleFilters = {}) {
  try {
    return await db.$count(cardExampleTable, getCardExampleConditions(filters));
  } catch (error) {
    console.error("Error counting CardExamples:", error);
    throw error;
  }
}

export async function createCardExample(
  data: NewCardExample,
): Promise<CardExample> {
  try {
    const rows = await db.insert(cardExampleTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating cardExample:", error);
    throw error;
  }
}

export async function createCardExamples(
  data: NewCardExample[],
): Promise<CardExample[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) => tx.insert(cardExampleTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating CardExamples:", error);
    throw error;
  }
}

export async function updateCardExample(id: number, data: UpdateCardExample) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(cardExampleTable)
      .set(data)
      .where(eq(cardExampleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating cardExample:", error);
    throw error;
  }
}

export async function deleteCardExample(id: number) {
  try {
    const rows = await db
      .delete(cardExampleTable)
      .where(eq(cardExampleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting cardExample:", error);
    throw error;
  }
}
