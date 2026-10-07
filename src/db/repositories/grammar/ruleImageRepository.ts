import { and, asc, eq } from "drizzle-orm";
import { ruleImageTable } from "../../schemas/grammar/ruleImage";
import { db } from "../../../config/db";
import {
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type RuleImage = typeof ruleImageTable.$inferSelect;
export type NewRuleImage = Omit<
  typeof ruleImageTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateRuleImage = Partial<NewRuleImage>;

export interface RuleImageFilters {
  ruleId?: number;
}

export type RuleImageQuery = RuleImageFilters & PaginationOptions;

function getRuleImageConditions(filters: RuleImageFilters) {
  return and(
    filters.ruleId !== undefined
      ? eq(ruleImageTable.ruleId, filters.ruleId)
      : undefined,
  );
}

export async function getRuleImageById(id: number) {
  try {
    const rows = await db
      .select()
      .from(ruleImageTable)
      .where(eq(ruleImageTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching ruleImage by ID:", error);
    throw error;
  }
}

export async function getRuleImages(options: RuleImageQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(ruleImageTable)
      .where(getRuleImageConditions(options))
      .orderBy(asc(ruleImageTable.order), asc(ruleImageTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching RuleImages:", error);
    throw error;
  }
}

export async function countRuleImages(filters: RuleImageFilters = {}) {
  try {
    return await db.$count(ruleImageTable, getRuleImageConditions(filters));
  } catch (error) {
    console.error("Error counting RuleImages:", error);
    throw error;
  }
}

export async function createRuleImage(data: NewRuleImage): Promise<RuleImage> {
  try {
    const rows = await db.insert(ruleImageTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating ruleImage:", error);
    throw error;
  }
}

export async function createRuleImages(
  data: NewRuleImage[],
): Promise<RuleImage[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) => tx.insert(ruleImageTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating RuleImages:", error);
    throw error;
  }
}

export async function updateRuleImage(id: number, data: UpdateRuleImage) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(ruleImageTable)
      .set(data)
      .where(eq(ruleImageTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating ruleImage:", error);
    throw error;
  }
}

export async function deleteRuleImage(id: number) {
  try {
    const rows = await db
      .delete(ruleImageTable)
      .where(eq(ruleImageTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting ruleImage:", error);
    throw error;
  }
}
