import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionPrimaryInfoTable } from "../../schemas/grammar/ruleSectionPrimaryInfo";
import { db } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type RuleSectionPrimaryInfo =
  typeof ruleSectionPrimaryInfoTable.$inferSelect;
export type NewRuleSectionPrimaryInfo = Omit<
  typeof ruleSectionPrimaryInfoTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateRuleSectionPrimaryInfo = Partial<NewRuleSectionPrimaryInfo>;

export interface RuleSectionPrimaryInfoFilters {
  ruleSectionId?: number;
  search?: string;
}

export type RuleSectionPrimaryInfoQuery = RuleSectionPrimaryInfoFilters &
  PaginationOptions;

function getRuleSectionPrimaryInfoConditions(
  filters: RuleSectionPrimaryInfoFilters,
) {
  return and(
    filters.ruleSectionId !== undefined
      ? eq(ruleSectionPrimaryInfoTable.ruleSectionId, filters.ruleSectionId)
      : undefined,
    filters.search !== undefined
      ? containsText(ruleSectionPrimaryInfoTable.content, filters.search)
      : undefined,
  );
}

export async function getRuleSectionPrimaryInfoById(id: number) {
  try {
    const rows = await db
      .select()
      .from(ruleSectionPrimaryInfoTable)
      .where(eq(ruleSectionPrimaryInfoTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching ruleSectionPrimaryInfo by ID:", error);
    throw error;
  }
}

export async function getRuleSectionPrimaryInfos(
  options: RuleSectionPrimaryInfoQuery = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(ruleSectionPrimaryInfoTable)
      .where(getRuleSectionPrimaryInfoConditions(options))
      .orderBy(
        asc(ruleSectionPrimaryInfoTable.order),
        asc(ruleSectionPrimaryInfoTable.id),
      )
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching RuleSectionPrimaryInfos:", error);
    throw error;
  }
}

export async function countRuleSectionPrimaryInfos(
  filters: RuleSectionPrimaryInfoFilters = {},
) {
  try {
    return await db.$count(
      ruleSectionPrimaryInfoTable,
      getRuleSectionPrimaryInfoConditions(filters),
    );
  } catch (error) {
    console.error("Error counting RuleSectionPrimaryInfos:", error);
    throw error;
  }
}

export async function createRuleSectionPrimaryInfo(
  data: NewRuleSectionPrimaryInfo,
): Promise<RuleSectionPrimaryInfo> {
  try {
    const rows = await db
      .insert(ruleSectionPrimaryInfoTable)
      .values(data)
      .returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating ruleSectionPrimaryInfo:", error);
    throw error;
  }
}

export async function createRuleSectionPrimaryInfos(
  data: NewRuleSectionPrimaryInfo[],
): Promise<RuleSectionPrimaryInfo[]> {
  try {
    return db.transaction((tx) =>
      data.map(
        (item) =>
          tx
            .insert(ruleSectionPrimaryInfoTable)
            .values(item)
            .returning()
            .get()!,
      ),
    );
  } catch (error) {
    console.error("Error creating RuleSectionPrimaryInfos:", error);
    throw error;
  }
}

export async function updateRuleSectionPrimaryInfo(
  id: number,
  data: UpdateRuleSectionPrimaryInfo,
) {
  try {
    validateUpdate(data);
    const rows = await db
      .update(ruleSectionPrimaryInfoTable)
      .set(data)
      .where(eq(ruleSectionPrimaryInfoTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating ruleSectionPrimaryInfo:", error);
    throw error;
  }
}

export async function deleteRuleSectionPrimaryInfo(id: number) {
  try {
    const rows = await db
      .delete(ruleSectionPrimaryInfoTable)
      .where(eq(ruleSectionPrimaryInfoTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting ruleSectionPrimaryInfo:", error);
    throw error;
  }
}
