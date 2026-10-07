import { and, asc, eq, getColumns, or } from "drizzle-orm";
import { ruleImageTable } from "../../schemas/grammar/ruleImage";
import { ruleSectionTable } from "../../schemas/grammar/ruleSection";
import { ruleSectionExampleTable } from "../../schemas/grammar/ruleSectionExample";
import { ruleSectionPrimaryInfoTable } from "../../schemas/grammar/ruleSectionPrimaryInfo";
import { ruleTable } from "../../schemas/grammar/rule";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  groupBy,
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
  const rows = await getDatabase()
    .select()
    .from(ruleTable)
    .where(eq(ruleTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRules(options: RuleQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(ruleTable)
    .where(getRuleConditions(options))
    .orderBy(asc(ruleTable.order), asc(ruleTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countRules(filters: RuleFilters = {}) {
  return await getDatabase().$count(ruleTable, getRuleConditions(filters));
}

export async function createRule(data: NewRule): Promise<Rule> {
  const rows = await getDatabase().insert(ruleTable).values(data).returning();
  return rows[0]!;
}

export async function createRules(data: NewRule[]): Promise<Rule[]> {
  return getDatabase().transaction((tx) =>
    data.map((item) => tx.insert(ruleTable).values(item).returning().get()!),
  );
}

export async function updateRule(id: number, data: UpdateRule) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(ruleTable)
    .set(data)
    .where(eq(ruleTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRule(id: number) {
  const rows = await getDatabase()
    .delete(ruleTable)
    .where(eq(ruleTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getRuleDetails(id: number) {
  return getDatabase().transaction((tx) => {
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

    const examplesBySection = groupBy(examples, (example) => example.ruleSectionId);
    const infoBySection = groupBy(primaryInfos, (info) => info.ruleSectionId);
    return {
      ...rule,
      images,
      sections: sections.map((section) => ({
        ...section,
        examples: examplesBySection.get(section.id) ?? [],
        primaryInfos: infoBySection.get(section.id) ?? [],
      })),
    };
  });
}
