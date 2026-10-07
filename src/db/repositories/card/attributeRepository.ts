import { and, asc, eq } from "drizzle-orm";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";
import { attributeTable } from "../../schemas/card/attribute";
import { getDatabase } from "../../../config/db";

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
  const rows = await getDatabase()
    .select()
    .from(attributeTable)
    .where(eq(attributeTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAttributes(options: AttributeQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(attributeTable)
    .where(getAttributeConditions(options))
    .orderBy(asc(attributeTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countAttributes(filters: AttributeFilters = {}) {
  return await getDatabase().$count(attributeTable, getAttributeConditions(filters));
}

export async function createAttribute(data: NewAttribute): Promise<Attribute> {
  const rows = await getDatabase().insert(attributeTable).values(data).returning();
  return rows[0]!;
}

export async function createAttributes(
  data: NewAttribute[],
): Promise<Attribute[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) => tx.insert(attributeTable).values(item).returning().get()!,
    ),
  );
}

export async function updateAttribute(id: number, data: UpdateAttribute) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(attributeTable)
    .set(data)
    .where(eq(attributeTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteAttribute(id: number) {
  const rows = await getDatabase()
    .delete(attributeTable)
    .where(eq(attributeTable.id, id))
    .returning();
  return rows[0] ?? null;
}
