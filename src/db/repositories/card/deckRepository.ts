import { and, asc, eq, or } from "drizzle-orm";
import { deckTable } from "../../schemas/card/deck";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type Deck = typeof deckTable.$inferSelect;
export type NewDeck = Omit<
  typeof deckTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateDeck = Partial<NewDeck>;

export interface DeckFilters {
  name?: string;
  search?: string;
}

export type DeckQuery = DeckFilters & PaginationOptions;

function getDeckConditions(filters: DeckFilters) {
  return and(
    filters.name !== undefined ? eq(deckTable.name, filters.name) : undefined,
    filters.search !== undefined
      ? containsText(deckTable.name, filters.search)
      : undefined,
  );
}

export async function getDeckById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDecks(options: DeckQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(deckTable)
    .where(getDeckConditions(options))
    .orderBy(asc(deckTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countDecks(filters: DeckFilters = {}) {
  return await getDatabase().$count(deckTable, getDeckConditions(filters));
}

export async function createDeck(data: NewDeck): Promise<Deck> {
  const rows = await getDatabase().insert(deckTable).values(data).returning();
  return rows[0]!;
}

export async function createDecks(data: NewDeck[]): Promise<Deck[]> {
  return getDatabase().transaction((tx) =>
    data.map((item) => tx.insert(deckTable).values(item).returning().get()!),
  );
}

export async function updateDeck(id: number, data: UpdateDeck) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(deckTable)
    .set(data)
    .where(eq(deckTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteDeck(id: number) {
  const rows = await getDatabase()
    .delete(deckTable)
    .where(eq(deckTable.id, id))
    .returning();
  return rows[0] ?? null;
}
