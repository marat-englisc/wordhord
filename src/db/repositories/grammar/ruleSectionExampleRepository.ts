import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionExampleTable } from "../../schemas/grammar/ruleSectionExample";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type RuleSectionExample = typeof ruleSectionExampleTable.$inferSelect;
export type NewRuleSectionExample = Omit<
  typeof ruleSectionExampleTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateRuleSectionExample = Partial<NewRuleSectionExample>;

export interface RuleSectionExampleFilters {
  ruleSectionId?: number;
  search?: string;
}

export type RuleSectionExampleQuery = RuleSectionExampleFilters &
  PaginationOptions;

function getRuleSectionExampleConditions(filters: RuleSectionExampleFilters) {
  return and(
    filters.ruleSectionId !== undefined
      ? eq(ruleSectionExampleTable.ruleSectionId, filters.ruleSectionId)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(ruleSectionExampleTable.example, filters.search),
          containsText(
            ruleSectionExampleTable.exampleTranslation,
            filters.search,
          ),
        )
      : undefined,
  );
}

export async function getRuleSectionExampleById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(ruleSectionExampleTable)
    .where(eq(ruleSectionExampleTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRuleSectionExamples(
  options: RuleSectionExampleQuery = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(ruleSectionExampleTable)
    .where(getRuleSectionExampleConditions(options))
    .orderBy(
      asc(ruleSectionExampleTable.order),
      asc(ruleSectionExampleTable.id),
    )
    .limit(limit)
    .offset(offset);
}

export async function countRuleSectionExamples(
  filters: RuleSectionExampleFilters = {},
) {
  return await getDatabase().$count(
    ruleSectionExampleTable,
    getRuleSectionExampleConditions(filters),
  );
}

export async function createRuleSectionExample(
  data: NewRuleSectionExample,
): Promise<RuleSectionExample> {
  const rows = await getDatabase()
    .insert(ruleSectionExampleTable)
    .values(data)
    .returning();
  return rows[0]!;
}

export async function createRuleSectionExamples(
  data: NewRuleSectionExample[],
): Promise<RuleSectionExample[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) =>
        tx.insert(ruleSectionExampleTable).values(item).returning().get()!,
    ),
  );
}

export async function updateRuleSectionExample(
  id: number,
  data: UpdateRuleSectionExample,
) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(ruleSectionExampleTable)
    .set(data)
    .where(eq(ruleSectionExampleTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRuleSectionExample(id: number) {
  const rows = await getDatabase()
    .delete(ruleSectionExampleTable)
    .where(eq(ruleSectionExampleTable.id, id))
    .returning();
  return rows[0] ?? null;
}
