import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionTable } from "../../schemas/grammar/ruleSection";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type RuleSection = typeof ruleSectionTable.$inferSelect;
export type NewRuleSection = Omit<
  typeof ruleSectionTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateRuleSection = Partial<NewRuleSection>;

export interface RuleSectionFilters {
  ruleId?: number;
  search?: string;
}

export type RuleSectionQuery = RuleSectionFilters & PaginationOptions;

function getRuleSectionConditions(filters: RuleSectionFilters) {
  return and(
    filters.ruleId !== undefined
      ? eq(ruleSectionTable.ruleId, filters.ruleId)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(ruleSectionTable.title, filters.search),
          containsText(ruleSectionTable.content, filters.search),
        )
      : undefined,
  );
}

export async function getRuleSectionById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(ruleSectionTable)
    .where(eq(ruleSectionTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRuleSections(options: RuleSectionQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(ruleSectionTable)
    .where(getRuleSectionConditions(options))
    .orderBy(asc(ruleSectionTable.order), asc(ruleSectionTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countRuleSections(filters: RuleSectionFilters = {}) {
  return await getDatabase().$count(ruleSectionTable, getRuleSectionConditions(filters));
}

export async function createRuleSection(
  data: NewRuleSection,
): Promise<RuleSection> {
  const rows = await getDatabase().insert(ruleSectionTable).values(data).returning();
  return rows[0]!;
}

export async function createRuleSections(
  data: NewRuleSection[],
): Promise<RuleSection[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) => tx.insert(ruleSectionTable).values(item).returning().get()!,
    ),
  );
}

export async function updateRuleSection(id: number, data: UpdateRuleSection) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(ruleSectionTable)
    .set(data)
    .where(eq(ruleSectionTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRuleSection(id: number) {
  const rows = await getDatabase()
    .delete(ruleSectionTable)
    .where(eq(ruleSectionTable.id, id))
    .returning();
  return rows[0] ?? null;
}
