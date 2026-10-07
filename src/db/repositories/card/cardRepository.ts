import { and, asc, eq, getColumns, or } from "drizzle-orm";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { cardExampleTable } from "../../schemas/card/cardExample";
import { cardMeaningAttributeTable } from "../../schemas/card/cardMeaningAttribute";
import { attributeTable } from "../../schemas/card/attribute";
import { cardTable } from "../../schemas/card/card";
import { db } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type Card = typeof cardTable.$inferSelect;
export type NewCard = Omit<
  typeof cardTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCard = Partial<NewCard>;

export interface CardFilters {
  deckId?: number;
  title?: string;
  search?: string;
}

export type CardQuery = CardFilters & PaginationOptions;

function getCardConditions(filters: CardFilters) {
  return and(
    filters.deckId !== undefined
      ? eq(cardTable.deckId, filters.deckId)
      : undefined,
    filters.title !== undefined
      ? eq(cardTable.title, filters.title)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(cardTable.title, filters.search),
          containsText(cardTable.transcription, filters.search),
        )
      : undefined,
  );
}

export async function getCardById(id: number) {
  try {
    const rows = await db
      .select()
      .from(cardTable)
      .where(eq(cardTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching card by ID:", error);
    throw error;
  }
}

export async function getCards(options: CardQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(cardTable)
      .where(getCardConditions(options))
      .orderBy(asc(cardTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching Cards:", error);
    throw error;
  }
}

export async function countCards(filters: CardFilters = {}) {
  try {
    return await db.$count(cardTable, getCardConditions(filters));
  } catch (error) {
    console.error("Error counting Cards:", error);
    throw error;
  }
}

export async function createCard(data: NewCard): Promise<Card> {
  try {
    const rows = await db.insert(cardTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating card:", error);
    throw error;
  }
}

export async function createCards(data: NewCard[]): Promise<Card[]> {
  try {
    return db.transaction((tx) =>
      data.map((item) => tx.insert(cardTable).values(item).returning().get()!),
    );
  } catch (error) {
    console.error("Error creating Cards:", error);
    throw error;
  }
}

export async function updateCard(id: number, data: UpdateCard) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(cardTable)
      .set(data)
      .where(eq(cardTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating card:", error);
    throw error;
  }
}

export async function deleteCard(id: number) {
  try {
    const rows = await db
      .delete(cardTable)
      .where(eq(cardTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting card:", error);
    throw error;
  }
}

export async function getCardDetails(id: number) {
  try {
    return db.transaction((tx) => {
      const card = tx
        .select()
        .from(cardTable)
        .where(eq(cardTable.id, id))
        .get();
      if (!card) return null;

      const meanings = tx
        .select()
        .from(cardMeaningTable)
        .where(eq(cardMeaningTable.cardId, id))
        .orderBy(asc(cardMeaningTable.id))
        .all();
      const examples = tx
        .select(getColumns(cardExampleTable))
        .from(cardExampleTable)
        .innerJoin(
          cardMeaningTable,
          eq(cardExampleTable.cardMeaningId, cardMeaningTable.id),
        )
        .where(eq(cardMeaningTable.cardId, id))
        .orderBy(asc(cardExampleTable.id))
        .all();
      const attributes = tx
        .select({
          link: getColumns(cardMeaningAttributeTable),
          attribute: getColumns(attributeTable),
        })
        .from(cardMeaningAttributeTable)
        .innerJoin(
          cardMeaningTable,
          eq(cardMeaningAttributeTable.cardMeaningId, cardMeaningTable.id),
        )
        .innerJoin(
          attributeTable,
          eq(cardMeaningAttributeTable.attributeId, attributeTable.id),
        )
        .where(eq(cardMeaningTable.cardId, id))
        .orderBy(asc(cardMeaningAttributeTable.id))
        .all();

      return {
        ...card,
        meanings: meanings.map((meaning) => ({
          ...meaning,
          examples: examples.filter(
            (example) => example.cardMeaningId === meaning.id,
          ),
          attributes: attributes
            .filter(({ link }) => link.cardMeaningId === meaning.id)
            .map(({ link, attribute }) => ({ ...link, attribute })),
        })),
      };
    });
  } catch (error) {
    console.error("Error fetching full card:", error);
    throw error;
  }
}
