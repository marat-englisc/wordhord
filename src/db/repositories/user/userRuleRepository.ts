import { and, asc, eq, getColumns } from "drizzle-orm";
import { ruleTable } from "../../schemas/grammar/rule";
import { userRuleTable } from "../../schemas/user/userRule";
import { db } from "../../../config/db";
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
  try {
    const rows = await db
      .select()
      .from(userRuleTable)
      .where(eq(userRuleTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userRule by ID:", error);
    throw error;
  }
}

export async function getUserRules(options: UserRuleQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(userRuleTable)
      .where(getUserRuleConditions(options))
      .orderBy(asc(userRuleTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching UserRules:", error);
    throw error;
  }
}

export async function countUserRules(filters: UserRuleFilters = {}) {
  try {
    return await db.$count(userRuleTable, getUserRuleConditions(filters));
  } catch (error) {
    console.error("Error counting UserRules:", error);
    throw error;
  }
}

export async function createUserRule(data: NewUserRule): Promise<UserRule> {
  try {
    const rows = await db.insert(userRuleTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating userRule:", error);
    throw error;
  }
}

export async function deleteUserRule(id: number) {
  try {
    const rows = await db
      .delete(userRuleTable)
      .where(eq(userRuleTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userRule:", error);
    throw error;
  }
}

export async function getUserRuleByUserAndRule(userId: number, ruleId: number) {
  try {
    const rows = await db
      .select()
      .from(userRuleTable)
      .where(
        and(eq(userRuleTable.userId, userId), eq(userRuleTable.ruleId, ruleId)),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userRule by relation:", error);
    throw error;
  }
}

export async function getOrCreateUserRule(
  data: NewUserRule,
): Promise<UserRule> {
  try {
    return db.transaction((tx) => {
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
  } catch (error) {
    console.error("Error getting or creating userRule:", error);
    throw error;
  }
}

export async function deleteUserRuleByUserAndRule(
  userId: number,
  ruleId: number,
) {
  try {
    const rows = await db
      .delete(userRuleTable)
      .where(
        and(eq(userRuleTable.userId, userId), eq(userRuleTable.ruleId, ruleId)),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userRule by relation:", error);
    throw error;
  }
}

export async function getRulesForUser(
  userId: number,
  options: PaginationOptions = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
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
  } catch (error) {
    console.error("Error fetching rules for user:", error);
    throw error;
  }
}
