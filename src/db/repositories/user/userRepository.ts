import { and, asc, eq, or } from "drizzle-orm";
import { userTable } from "../../schemas/user/user";
import { db } from "../../../config/db";
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
  try {
    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.telegramId, telegramId))
      .limit(1)
      .then((result) => result[0]);

    return user || null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
}

export async function getUserByTelegramId(telegramId: number) {
  try {
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.telegramId, telegramId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching user by Telegram ID:", error);
    throw error;
  }
}

export async function getUserByDatabaseId(id: number) {
  try {
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
}

export async function getUsers(options: UserQuery = {}) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(userTable)
      .where(getUserConditions(options))
      .orderBy(asc(userTable.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching Users:", error);
    throw error;
  }
}

export async function countUsers(filters: UserFilters = {}) {
  try {
    return await db.$count(userTable, getUserConditions(filters));
  } catch (error) {
    console.error("Error counting Users:", error);
    throw error;
  }
}

export async function createUser(data: NewUser): Promise<User> {
  try {
    const rows = await db.insert(userTable).values(data).returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function updateUser(id: number, data: UpdateUser) {
  try {
    validateUpdate(data, ["telegramId"]);
    const rows = await db
      .update(userTable)
      .set(data)
      .where(eq(userTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  try {
    const rows = await db
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

export async function getOrCreateUser(data: NewUser) {
  try {
    return db.transaction((tx) => {
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
  } catch (error) {
    console.error("Error getting or creating user:", error);
    throw error;
  }
}
