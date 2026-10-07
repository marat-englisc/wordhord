import { and, asc, eq } from "drizzle-orm";
import { ruleImageTable } from "../../schemas/grammar/ruleImage";
import { getDatabase } from "../../../config/db";
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
  const rows = await getDatabase()
    .select()
    .from(ruleImageTable)
    .where(eq(ruleImageTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRuleImages(options: RuleImageQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(ruleImageTable)
    .where(getRuleImageConditions(options))
    .orderBy(asc(ruleImageTable.order), asc(ruleImageTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countRuleImages(filters: RuleImageFilters = {}) {
  return await getDatabase().$count(ruleImageTable, getRuleImageConditions(filters));
}

export async function createRuleImage(data: NewRuleImage): Promise<RuleImage> {
  const rows = await getDatabase().insert(ruleImageTable).values(data).returning();
  return rows[0]!;
}

export async function createRuleImages(
  data: NewRuleImage[],
): Promise<RuleImage[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) => tx.insert(ruleImageTable).values(item).returning().get()!,
    ),
  );
}

export async function updateRuleImage(id: number, data: UpdateRuleImage) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(ruleImageTable)
    .set(data)
    .where(eq(ruleImageTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRuleImage(id: number) {
  const rows = await getDatabase()
    .delete(ruleImageTable)
    .where(eq(ruleImageTable.id, id))
    .returning();
  return rows[0] ?? null;
}
