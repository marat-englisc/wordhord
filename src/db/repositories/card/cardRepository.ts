import { and, asc, eq, getColumns, or } from "drizzle-orm";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { cardExampleTable } from "../../schemas/card/cardExample";
import { cardMeaningAttributeTable } from "../../schemas/card/cardMeaningAttribute";
import { attributeTable } from "../../schemas/card/attribute";
import { cardTable } from "../../schemas/card/card";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  groupBy,
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
  const rows = await getDatabase()
    .select()
    .from(cardTable)
    .where(eq(cardTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCards(options: CardQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(cardTable)
    .where(getCardConditions(options))
    .orderBy(asc(cardTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countCards(filters: CardFilters = {}) {
  return await getDatabase().$count(cardTable, getCardConditions(filters));
}

export async function createCard(data: NewCard): Promise<Card> {
  const rows = await getDatabase().insert(cardTable).values(data).returning();
  return rows[0]!;
}

export async function createCards(data: NewCard[]): Promise<Card[]> {
  return getDatabase().transaction((tx) =>
    data.map((item) => tx.insert(cardTable).values(item).returning().get()!),
  );
}

export async function updateCard(id: number, data: UpdateCard) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(cardTable)
    .set(data)
    .where(eq(cardTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCard(id: number) {
  const rows = await getDatabase()
    .delete(cardTable)
    .where(eq(cardTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getCardDetails(id: number) {
  return getDatabase().transaction((tx) => {
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

    const examplesByMeaning = groupBy(examples, (example) => example.cardMeaningId);
    const attributesByMeaning = groupBy(
      attributes.map(({ link, attribute }) => ({ ...link, attribute })),
      (link) => link.cardMeaningId,
    );
    return {
      ...card,
      meanings: meanings.map((meaning) => ({
        ...meaning,
        examples: examplesByMeaning.get(meaning.id) ?? [],
        attributes: attributesByMeaning.get(meaning.id) ?? [],
      })),
    };
  });
}
