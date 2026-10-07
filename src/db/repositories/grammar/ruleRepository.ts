import { and, asc, eq, getColumns, or } from "drizzle-orm";
import { ruleImageTable } from "../../schemas/grammar/ruleImage";
import { ruleSectionTable } from "../../schemas/grammar/ruleSection";
import { ruleSectionExampleTable } from "../../schemas/grammar/ruleSectionExample";
import { ruleSectionPrimaryInfoTable } from "../../schemas/grammar/ruleSectionPrimaryInfo";
import { ruleTable } from "../../schemas/grammar/rule";
import { db } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type Rule = typeof ruleTable.$inferSelect;
export type NewRule = Omit<
  typeof ruleTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateRule = Partial<NewRule>;

export interface RuleFilters {
  name?: string;
  search?: string;
}

export type RuleQuery = RuleFilters & PaginationOptions;

function getRuleConditions(filters: RuleFilters) {
  return and(
    filters.name !== undefined ? eq(ruleTable.name, filters.name) : undefined,
    filters.search !== undefined
      ? containsText(ruleTable.name, filters.search)
      : undefined,
  );
}

export async function getRuleById(id: number) {
  try {
    const rows = await db
      .select()
      .from(ruleTable)
      .where(eq(ruleTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching rule by ID:", error);
    throw error;
  }
}

export async function getRules(options: RuleQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(ruleTable)
      .where(getRuleConditions(options))
      .orderBy(asc(ruleTable.order), asc(ruleTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching Rules:", error);
    throw error;
  }
}

export async function countRules(filters: RuleFilters = {}) {
  try {
    return await db.$count(ruleTable, getRuleConditions(filters));
  } catch (error) {
    console.error("Error counting Rules:", error);
    throw error;
  }
}

export async function createRule(data: NewRule): Promise<Rule> {
  try {
    const rows = await db.insert(ruleTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating rule:", error);
    throw error;
  }
}

export async function createRules(data: NewRule[]): Promise<Rule[]> {
  try {
    return db.transaction((tx) =>
      data.map((item) => tx.insert(ruleTable).values(item).returning().get()!),
    );
  } catch (error) {
    console.error("Error creating Rules:", error);
    throw error;
  }
}

export async function updateRule(id: number, data: UpdateRule) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(ruleTable)
      .set(data)
      .where(eq(ruleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating rule:", error);
    throw error;
  }
}

export async function deleteRule(id: number) {
  try {
    const rows = await db
      .delete(ruleTable)
      .where(eq(ruleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting rule:", error);
    throw error;
  }
}

export async function getRuleDetails(id: number) {
  try {
    return db.transaction((tx) => {
      const rule = tx
        .select()
        .from(ruleTable)
        .where(eq(ruleTable.id, id))
        .get();
      if (!rule) return null;

      const images = tx
        .select()
        .from(ruleImageTable)
        .where(eq(ruleImageTable.ruleId, id))
        .orderBy(asc(ruleImageTable.order), asc(ruleImageTable.id))
        .all();
      const sections = tx
        .select()
        .from(ruleSectionTable)
        .where(eq(ruleSectionTable.ruleId, id))
        .orderBy(asc(ruleSectionTable.order), asc(ruleSectionTable.id))
        .all();
      const examples = tx
        .select(getColumns(ruleSectionExampleTable))
        .from(ruleSectionExampleTable)
        .innerJoin(
          ruleSectionTable,
          eq(ruleSectionExampleTable.ruleSectionId, ruleSectionTable.id),
        )
        .where(eq(ruleSectionTable.ruleId, id))
        .orderBy(
          asc(ruleSectionExampleTable.order),
          asc(ruleSectionExampleTable.id),
        )
        .all();
      const primaryInfos = tx
        .select(getColumns(ruleSectionPrimaryInfoTable))
        .from(ruleSectionPrimaryInfoTable)
        .innerJoin(
          ruleSectionTable,
          eq(ruleSectionPrimaryInfoTable.ruleSectionId, ruleSectionTable.id),
        )
        .where(eq(ruleSectionTable.ruleId, id))
        .orderBy(
          asc(ruleSectionPrimaryInfoTable.order),
          asc(ruleSectionPrimaryInfoTable.id),
        )
        .all();

      return {
        ...rule,
        images,
        sections: sections.map((section) => ({
          ...section,
          examples: examples.filter(
            (example) => example.ruleSectionId === section.id,
          ),
          primaryInfos: primaryInfos.filter(
            (info) => info.ruleSectionId === section.id,
          ),
        })),
      };
    });
  } catch (error) {
    console.error("Error fetching full grammar rule:", error);
    throw error;
  }
}
