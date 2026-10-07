import { and, asc, eq } from "drizzle-orm";
import { cardMeaningAttributeTable } from "../../schemas/card/cardMeaningAttribute";
import { db } from "../../../config/db";
import {
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type CardMeaningAttribute =
  typeof cardMeaningAttributeTable.$inferSelect;
export type NewCardMeaningAttribute = Omit<
  typeof cardMeaningAttributeTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCardMeaningAttribute = Partial<NewCardMeaningAttribute>;

export interface CardMeaningAttributeFilters {
  cardMeaningId?: number;
  attributeId?: number;
  value?: string;
}

export type CardMeaningAttributeQuery = CardMeaningAttributeFilters &
  PaginationOptions;

function getCardMeaningAttributeConditions(
  filters: CardMeaningAttributeFilters,
) {
  return and(
    filters.cardMeaningId !== undefined
      ? eq(cardMeaningAttributeTable.cardMeaningId, filters.cardMeaningId)
      : undefined,
    filters.attributeId !== undefined
      ? eq(cardMeaningAttributeTable.attributeId, filters.attributeId)
      : undefined,
    filters.value !== undefined
      ? eq(cardMeaningAttributeTable.value, filters.value)
      : undefined,
  );
}

export async function getCardMeaningAttributeById(id: number) {
  try {
    const rows = await db
      .select()
      .from(cardMeaningAttributeTable)
      .where(eq(cardMeaningAttributeTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching cardMeaningAttribute by ID:", error);
    throw error;
  }
}

export async function getCardMeaningAttributes(
  options: CardMeaningAttributeQuery = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(cardMeaningAttributeTable)
      .where(getCardMeaningAttributeConditions(options))
      .orderBy(asc(cardMeaningAttributeTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching CardMeaningAttributes:", error);
    throw error;
  }
}

export async function countCardMeaningAttributes(
  filters: CardMeaningAttributeFilters = {},
) {
  try {
    return await db.$count(
      cardMeaningAttributeTable,
      getCardMeaningAttributeConditions(filters),
    );
  } catch (error) {
    console.error("Error counting CardMeaningAttributes:", error);
    throw error;
  }
}

export async function createCardMeaningAttribute(
  data: NewCardMeaningAttribute,
): Promise<CardMeaningAttribute> {
  try {
    const rows = await db
      .insert(cardMeaningAttributeTable)
      .values(data)
      .returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating cardMeaningAttribute:", error);
    throw error;
  }
}

export async function createCardMeaningAttributes(
  data: NewCardMeaningAttribute[],
): Promise<CardMeaningAttribute[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) =>
          tx.insert(cardMeaningAttributeTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating CardMeaningAttributes:", error);
    throw error;
  }
}

export async function updateCardMeaningAttribute(
  id: number,
  data: UpdateCardMeaningAttribute,
) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(cardMeaningAttributeTable)
      .set(data)
      .where(eq(cardMeaningAttributeTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating cardMeaningAttribute:", error);
    throw error;
  }
}

export async function deleteCardMeaningAttribute(id: number) {
  try {
    const rows = await db
      .delete(cardMeaningAttributeTable)
      .where(eq(cardMeaningAttributeTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting cardMeaningAttribute:", error);
    throw error;
  }
}

export async function getCardMeaningAttributeByValue(
  cardMeaningId: number,
  attributeId: number,
  value: string,
) {
  try {
    const rows = await db
      .select()
      .from(cardMeaningAttributeTable)
      .where(
        and(
          eq(cardMeaningAttributeTable.cardMeaningId, cardMeaningId),
          eq(cardMeaningAttributeTable.attributeId, attributeId),
          eq(cardMeaningAttributeTable.value, value),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching card meaning attribute by value:", error);
    throw error;
  }
}

export async function getOrCreateCardMeaningAttribute(
  data: NewCardMeaningAttribute,
): Promise<CardMeaningAttribute> {
  try {
    return db.transaction((tx) => {
      const inserted = tx
        .insert(cardMeaningAttributeTable)
        .values(data)
        .onConflictDoNothing({
          target: [
            cardMeaningAttributeTable.cardMeaningId,
            cardMeaningAttributeTable.attributeId,
            cardMeaningAttributeTable.value,
          ],
        })
        .returning()
        .get();
      if (inserted) return inserted;

      return tx
        .select()
        .from(cardMeaningAttributeTable)
        .where(
          and(
            eq(cardMeaningAttributeTable.cardMeaningId, data.cardMeaningId),
            eq(cardMeaningAttributeTable.attributeId, data.attributeId),
            eq(cardMeaningAttributeTable.value, data.value),
          ),
        )
        .get()!;
    });
  } catch (error) {
    console.error("Error getting or creating cardMeaningAttribute:", error);
    throw error;
  }
}
