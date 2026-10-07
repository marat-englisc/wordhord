import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionExampleTable } from "../../schemas/grammar/ruleSectionExample";
import { db } from "../../../config/db";
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
  try {
    const rows = await db
      .select()
      .from(ruleSectionExampleTable)
      .where(eq(ruleSectionExampleTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching ruleSectionExample by ID:", error);
    throw error;
  }
}

export async function getRuleSectionExamples(
  options: RuleSectionExampleQuery = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(ruleSectionExampleTable)
      .where(getRuleSectionExampleConditions(options))
      .orderBy(
        asc(ruleSectionExampleTable.order),
        asc(ruleSectionExampleTable.id),
      )
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching RuleSectionExamples:", error);
    throw error;
  }
}

export async function countRuleSectionExamples(
  filters: RuleSectionExampleFilters = {},
) {
  try {
    return await db.$count(
      ruleSectionExampleTable,
      getRuleSectionExampleConditions(filters),
    );
  } catch (error) {
    console.error("Error counting RuleSectionExamples:", error);
    throw error;
  }
}

export async function createRuleSectionExample(
  data: NewRuleSectionExample,
): Promise<RuleSectionExample> {
  try {
    const rows = await db
      .insert(ruleSectionExampleTable)
      .values(data)
      .returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating ruleSectionExample:", error);
    throw error;
  }
}

export async function createRuleSectionExamples(
  data: NewRuleSectionExample[],
): Promise<RuleSectionExample[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) =>
          tx.insert(ruleSectionExampleTable).values(item).returning().get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating RuleSectionExamples:", error);
    throw error;
  }
}

export async function updateRuleSectionExample(
  id: number,
  data: UpdateRuleSectionExample,
) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(ruleSectionExampleTable)
      .set(data)
      .where(eq(ruleSectionExampleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating ruleSectionExample:", error);
    throw error;
  }
}

export async function deleteRuleSectionExample(id: number) {
  try {
    const rows = await db
      .delete(ruleSectionExampleTable)
      .where(eq(ruleSectionExampleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting ruleSectionExample:", error);
    throw error;
  }
}
