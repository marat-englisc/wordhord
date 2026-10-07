import { and, asc, eq, or } from "drizzle-orm";
import { userTable } from "../../schemas/user/user";
import { getDatabase } from "../../../config/db";
import {
  containsText,
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type User = typeof userTable.$inferSelect;
export type NewUser = Omit<
  typeof userTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUser = Partial<Omit<NewUser, "telegramId">>;

export interface UserFilters {
  telegramId?: number;
  username?: string;
  isAdmin?: boolean;
  search?: string;
}

export type UserQuery = UserFilters & PaginationOptions;

function getUserConditions(filters: UserFilters) {
  return and(
    filters.telegramId !== undefined
      ? eq(userTable.telegramId, filters.telegramId)
      : undefined,
    filters.username !== undefined
      ? eq(userTable.username, filters.username)
      : undefined,
    filters.isAdmin !== undefined
      ? eq(userTable.isAdmin, filters.isAdmin)
      : undefined,
    filters.search !== undefined
      ? or(
          containsText(userTable.username, filters.search),
          containsText(userTable.firstName, filters.search),
          containsText(userTable.lastName, filters.search),
        )
      : undefined,
  );
}

export async function getUserById(telegramId: number) {
  const user = await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.telegramId, telegramId))
    .limit(1)
    .then((result) => result[0]);

  return user || null;
}

export async function getUserByTelegramId(telegramId: number) {
  const rows = await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.telegramId, telegramId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserByDatabaseId(id: number) {
  const rows = await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUsers(options: UserQuery = {}) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userTable)
    .where(getUserConditions(options))
    .orderBy(asc(userTable.id))
    .limit(limit)
    .offset(offset);
}

export async function countUsers(filters: UserFilters = {}) {
  return await getDatabase().$count(userTable, getUserConditions(filters));
}

export async function createUser(data: NewUser): Promise<User> {
  const rows = await getDatabase().insert(userTable).values(data).returning();
  return rows[0]!;
}

export async function updateUser(id: number, data: UpdateUser) {
  validateUpdate(data, ["telegramId"]);
  const rows = await getDatabase()
    .update(userTable)
    .set(data)
    .where(eq(userTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteUser(id: number) {
  const rows = await getDatabase()
    .delete(userTable)
    .where(eq(userTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getOrCreateUser(data: NewUser) {
  return getDatabase().transaction((tx) => {
    const inserted = tx
      .insert(userTable)
      .values(data)
      .onConflictDoNothing({
        target: userTable.telegramId,
      })
      .returning()
      .get();
    if (inserted) return { user: inserted, created: true };

    const user = tx
      .select()
      .from(userTable)
      .where(eq(userTable.telegramId, data.telegramId))
      .get()!;
    return { user, created: false };
  });
}
