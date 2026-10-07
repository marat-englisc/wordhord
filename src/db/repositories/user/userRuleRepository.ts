import { and, asc, eq, getColumns } from "drizzle-orm";
import { ruleTable } from "../../schemas/grammar/rule";
import { userRuleTable } from "../../schemas/user/userRule";
import { getDatabase } from "../../../config/db";
import { getPagination, type PaginationOptions } from "../queryUtils";

export type UserRule = typeof userRuleTable.$inferSelect;
export type NewUserRule = Omit<
  typeof userRuleTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

export interface UserRuleFilters {
  userId?: number;
  ruleId?: number;
}

export type UserRuleQuery = UserRuleFilters & PaginationOptions;

function getUserRuleConditions(filters: UserRuleFilters) {
  return and(
    filters.userId !== undefined
      ? eq(userRuleTable.userId, filters.userId)
      : undefined,
    filters.ruleId !== undefined
      ? eq(userRuleTable.ruleId, filters.ruleId)
      : undefined,
  );
}

export async function getUserRuleById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(userRuleTable)
    .where(eq(userRuleTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserRules(options: UserRuleQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userRuleTable)
    .where(getUserRuleConditions(options))
    .orderBy(asc(userRuleTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countUserRules(filters: UserRuleFilters = {}) {
  return await getDatabase().$count(userRuleTable, getUserRuleConditions(filters));
}

export async function createUserRule(data: NewUserRule): Promise<UserRule> {
  const rows = await getDatabase().insert(userRuleTable).values(data).returning();
  return rows[0]!;
}

export async function deleteUserRule(id: number) {
  const rows = await getDatabase()
    .delete(userRuleTable)
    .where(eq(userRuleTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getUserRuleByUserAndRule(userId: number, ruleId: number) {
  const rows = await getDatabase()
    .select()
    .from(userRuleTable)
    .where(
      and(eq(userRuleTable.userId, userId), eq(userRuleTable.ruleId, ruleId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrCreateUserRule(
  data: NewUserRule,
): Promise<UserRule> {
  return getDatabase().transaction((tx) => {
    const inserted = tx
      .insert(userRuleTable)
      .values(data)
      .onConflictDoNothing({
        target: [userRuleTable.userId, userRuleTable.ruleId],
      })
      .returning()
      .get();
    if (inserted) return inserted;

    return tx
      .select()
      .from(userRuleTable)
      .where(
        and(
          eq(userRuleTable.userId, data.userId),
          eq(userRuleTable.ruleId, data.ruleId),
        ),
      )
      .get()!;
  });
}

export async function deleteUserRuleByUserAndRule(
  userId: number,
  ruleId: number,
) {
  const rows = await getDatabase()
    .delete(userRuleTable)
    .where(
      and(eq(userRuleTable.userId, userId), eq(userRuleTable.ruleId, ruleId)),
    )
    .returning();
  return rows[0] ?? null;
}

export async function getRulesForUser(
  userId: number,
  options: PaginationOptions = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select({
      rule: getColumns(ruleTable),
      userRule: getColumns(userRuleTable),
    })
    .from(userRuleTable)
    .innerJoin(ruleTable, eq(userRuleTable.ruleId, ruleTable.id))
    .where(eq(userRuleTable.userId, userId))
    .orderBy(asc(ruleTable.order), asc(ruleTable.id))
    .limit(limit)
    .offset(offset);
}
