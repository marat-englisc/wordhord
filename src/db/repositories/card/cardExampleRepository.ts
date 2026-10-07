import { and, asc, eq, or } from "drizzle-orm";
import { cardExampleTable } from "../../schemas/card/cardExample";
import { getDatabase } from "../../../config/db";
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
  const rows = await getDatabase()
    .select()
    .from(cardExampleTable)
    .where(eq(cardExampleTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCardExamples(options: CardExampleQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(cardExampleTable)
    .where(getCardExampleConditions(options))
    .orderBy(asc(cardExampleTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countCardExamples(filters: CardExampleFilters = {}) {
  return await getDatabase().$count(cardExampleTable, getCardExampleConditions(filters));
}

export async function createCardExample(
  data: NewCardExample,
): Promise<CardExample> {
  const rows = await getDatabase().insert(cardExampleTable).values(data).returning();
  return rows[0]!;
}

export async function createCardExamples(
  data: NewCardExample[],
): Promise<CardExample[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) => tx.insert(cardExampleTable).values(item).returning().get()!,
    ),
  );
}

export async function updateCardExample(id: number, data: UpdateCardExample) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(cardExampleTable)
    .set(data)
    .where(eq(cardExampleTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCardExample(id: number) {
  const rows = await getDatabase()
    .delete(cardExampleTable)
    .where(eq(cardExampleTable.id, id))
    .returning();
  return rows[0] ?? null;
}
