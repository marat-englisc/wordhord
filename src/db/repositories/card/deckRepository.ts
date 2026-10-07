import { and, asc, eq, or } from "drizzle-orm";
import { deckTable } from "../../schemas/card/deck";
import { db } from "../../../config/db";
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
  try {
    const rows = await db
      .select()
      .from(deckTable)
      .where(eq(deckTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching deck by ID:", error);
    throw error;
  }
}

export async function getDecks(options: DeckQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(deckTable)
      .where(getDeckConditions(options))
      .orderBy(asc(deckTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching Decks:", error);
    throw error;
  }
}

export async function countDecks(filters: DeckFilters = {}) {
  try {
    return await db.$count(deckTable, getDeckConditions(filters));
  } catch (error) {
    console.error("Error counting Decks:", error);
    throw error;
  }
}

export async function createDeck(data: NewDeck): Promise<Deck> {
  try {
    const rows = await db.insert(deckTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating deck:", error);
    throw error;
  }
}

export async function createDecks(data: NewDeck[]): Promise<Deck[]> {
  try {
    return db.transaction((tx) =>
      data.map((item) => tx.insert(deckTable).values(item).returning().get()!),
    );
  } catch (error) {
    console.error("Error creating Decks:", error);
    throw error;
  }
}

export async function updateDeck(id: number, data: UpdateDeck) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(deckTable)
      .set(data)
      .where(eq(deckTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating deck:", error);
    throw error;
  }
}

export async function deleteDeck(id: number) {
  try {
    const rows = await db
      .delete(deckTable)
      .where(eq(deckTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting deck:", error);
    throw error;
  }
}
