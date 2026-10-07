import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionTable } from "../../schemas/grammar/ruleSection";
import { db } from "../../../config/db";
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
  try {
    const rows = await db
      .select()
      .from(ruleSectionTable)
      .where(eq(ruleSectionTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching ruleSection by ID:", error);
    throw error;
  }
}

export async function getRuleSections(options: RuleSectionQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(ruleSectionTable)
      .where(getRuleSectionConditions(options))
      .orderBy(asc(ruleSectionTable.order), asc(ruleSectionTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching RuleSections:", error);
    throw error;
  }
}

export async function countRuleSections(filters: RuleSectionFilters = {}) {
  try {
    return await db.$count(ruleSectionTable, getRuleSectionConditions(filters));
  } catch (error) {
    console.error("Error counting RuleSections:", error);
    throw error;
  }
}

export async function createRuleSection(
  data: NewRuleSection,
): Promise<RuleSection> {
  try {
    const rows = await db.insert(ruleSectionTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating ruleSection:", error);
    throw error;
  }
}

export async function createRuleSections(
  data: NewRuleSection[],
): Promise<RuleSection[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) => tx.insert(ruleSectionTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating RuleSections:", error);
    throw error;
  }
}

export async function updateRuleSection(id: number, data: UpdateRuleSection) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(ruleSectionTable)
      .set(data)
      .where(eq(ruleSectionTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating ruleSection:", error);
    throw error;
  }
}

export async function deleteRuleSection(id: number) {
  try {
    const rows = await db
      .delete(ruleSectionTable)
      .where(eq(ruleSectionTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting ruleSection:", error);
    throw error;
  }
}
