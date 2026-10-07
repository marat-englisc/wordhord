import { and, asc, eq } from "drizzle-orm";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";
import { attributeTable } from "../../schemas/card/attribute";
import { db } from "../../../config/db";

export type Attribute = typeof attributeTable.$inferSelect;
export type NewAttribute = Omit<
  typeof attributeTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateAttribute = Partial<NewAttribute>;

export interface AttributeFilters {
  name?: string;
  search?: string;
}

export type AttributeQuery = AttributeFilters & PaginationOptions;

function getAttributeConditions(filters: AttributeFilters) {
  return and(
    filters.name !== undefined
      ? eq(attributeTable.name, filters.name)
      : undefined,
    filters.search !== undefined
      ? containsText(attributeTable.name, filters.search)
      : undefined,
  );
}

export async function getAttributeById(id: number) {
  try {
    const rows = await db
      .select()
      .from(attributeTable)
      .where(eq(attributeTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching attribute by ID:", error);
    throw error;
  }
}

export async function getAttributes(options: AttributeQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(attributeTable)
      .where(getAttributeConditions(options))
      .orderBy(asc(attributeTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching Attributes:", error);
    throw error;
  }
}

export async function countAttributes(filters: AttributeFilters = {}) {
  try {
    return await db.$count(attributeTable, getAttributeConditions(filters));
  } catch (error) {
    console.error("Error counting Attributes:", error);
    throw error;
  }
}

export async function createAttribute(data: NewAttribute): Promise<Attribute> {
  try {
    const rows = await db.insert(attributeTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating attribute:", error);
    throw error;
  }
}

export async function createAttributes(
  data: NewAttribute[],
): Promise<Attribute[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) => tx.insert(attributeTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating Attributes:", error);
    throw error;
  }
}

export async function updateAttribute(id: number, data: UpdateAttribute) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(attributeTable)
      .set(data)
      .where(eq(attributeTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating attribute:", error);
    throw error;
  }
}

export async function deleteAttribute(id: number) {
  try {
    const rows = await db
      .delete(attributeTable)
      .where(eq(attributeTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting attribute:", error);
    throw error;
  }
}
