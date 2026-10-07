import { and, asc, eq, or } from "drizzle-orm";
import { ruleSectionPrimaryInfoTable } from "../../schemas/grammar/ruleSectionPrimaryInfo";
import { getDatabase } from "../../../config/db";
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
  const rows = await getDatabase()
    .select()
    .from(ruleSectionPrimaryInfoTable)
    .where(eq(ruleSectionPrimaryInfoTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRuleSectionPrimaryInfos(
  options: RuleSectionPrimaryInfoQuery = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(ruleSectionPrimaryInfoTable)
    .where(getRuleSectionPrimaryInfoConditions(options))
    .orderBy(
      asc(ruleSectionPrimaryInfoTable.order),
      asc(ruleSectionPrimaryInfoTable.id),
    )
    .limit(limit)
    .offset(offset);
}

export async function countRuleSectionPrimaryInfos(
  filters: RuleSectionPrimaryInfoFilters = {},
) {
  return await getDatabase().$count(
    ruleSectionPrimaryInfoTable,
    getRuleSectionPrimaryInfoConditions(filters),
  );
}

export async function createRuleSectionPrimaryInfo(
  data: NewRuleSectionPrimaryInfo,
): Promise<RuleSectionPrimaryInfo> {
  const rows = await getDatabase()
    .insert(ruleSectionPrimaryInfoTable)
    .values(data)
    .returning();
  return rows[0]!;
}

export async function createRuleSectionPrimaryInfos(
  data: NewRuleSectionPrimaryInfo[],
): Promise<RuleSectionPrimaryInfo[]> {
  return getDatabase().transaction((tx) =>
    data.map(
      (item) =>
        tx
          .insert(ruleSectionPrimaryInfoTable)
          .values(item)
          .returning()
          .get()!,
    ),
  );
}

export async function updateRuleSectionPrimaryInfo(
  id: number,
  data: UpdateRuleSectionPrimaryInfo,
) {
  validateUpdate(data);
  const rows = await getDatabase()
    .update(ruleSectionPrimaryInfoTable)
    .set(data)
    .where(eq(ruleSectionPrimaryInfoTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRuleSectionPrimaryInfo(id: number) {
  const rows = await getDatabase()
    .delete(ruleSectionPrimaryInfoTable)
    .where(eq(ruleSectionPrimaryInfoTable.id, id))
    .returning();
  return rows[0] ?? null;
}
