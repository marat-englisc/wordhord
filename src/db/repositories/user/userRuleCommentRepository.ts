import { and, asc, eq, or, sql } from "drizzle-orm";
import { userRuleCommentTable } from "../../schemas/user/userRuleComment";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type UserRuleComment = typeof userRuleCommentTable.$inferSelect;
export type NewUserRuleComment = Omit<
  typeof userRuleCommentTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserRuleComment = Partial<
  Omit<NewUserRuleComment, "userId" | "ruleId">
>;

export interface UserRuleCommentFilters {
  userId?: number;
  ruleId?: number;
  search?: string;
}

export type UserRuleCommentQuery = UserRuleCommentFilters & PaginationOptions;

function getUserRuleCommentConditions(filters: UserRuleCommentFilters) {
  return and(
    filters.userId !== undefined
      ? eq(userRuleCommentTable.userId, filters.userId)
      : undefined,
    filters.ruleId !== undefined
      ? eq(userRuleCommentTable.ruleId, filters.ruleId)
      : undefined,
    filters.search !== undefined
      ? containsText(userRuleCommentTable.comment, filters.search)
      : undefined,
  );
}

export async function getUserRuleCommentById(id: number) {
  const rows = await getDatabase()
    .select()
    .from(userRuleCommentTable)
    .where(eq(userRuleCommentTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserRuleComments(options: UserRuleCommentQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userRuleCommentTable)
    .where(getUserRuleCommentConditions(options))
    .orderBy(asc(userRuleCommentTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countUserRuleComments(
  filters: UserRuleCommentFilters = {},
) {
  return await getDatabase().$count(
    userRuleCommentTable,
    getUserRuleCommentConditions(filters),
  );
}

export async function createUserRuleComment(
  data: NewUserRuleComment,
): Promise<UserRuleComment> {
  const rows = await getDatabase().insert(userRuleCommentTable).values(data).returning();
  return rows[0]!;
}

export async function updateUserRuleComment(
  id: number,
  data: UpdateUserRuleComment,
) {
  validateUpdate(data, ["userId", "ruleId"]);
  const rows = await getDatabase()
    .update(userRuleCommentTable)
    .set(data)
    .where(eq(userRuleCommentTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteUserRuleComment(id: number) {
  const rows = await getDatabase()
    .delete(userRuleCommentTable)
    .where(eq(userRuleCommentTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getUserRuleCommentByUserAndRule(
  userId: number,
  ruleId: number,
) {
  const rows = await getDatabase()
    .select()
    .from(userRuleCommentTable)
    .where(
      and(
        eq(userRuleCommentTable.userId, userId),
        eq(userRuleCommentTable.ruleId, ruleId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteUserRuleCommentByUserAndRule(
  userId: number,
  ruleId: number,
) {
  const rows = await getDatabase()
    .delete(userRuleCommentTable)
    .where(
      and(
        eq(userRuleCommentTable.userId, userId),
        eq(userRuleCommentTable.ruleId, ruleId),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export async function saveUserRuleComment(
  userId: number,
  ruleId: number,
  comment: string,
): Promise<UserRuleComment> {
  const rows = await getDatabase()
    .insert(userRuleCommentTable)
    .values({ userId, ruleId, comment })
    .onConflictDoUpdate({
      target: [userRuleCommentTable.userId, userRuleCommentTable.ruleId],
      set: { comment, updatedAt: sql`(CURRENT_TIMESTAMP)` },
    })
    .returning();
  return rows[0]!;
}
