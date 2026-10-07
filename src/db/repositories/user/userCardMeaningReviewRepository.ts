import { and, desc, eq, gte, lt } from "drizzle-orm";
import { userCardMeaningTable } from "../../schemas/user/userCardMeaning";
import type { NewUserCardMeaning } from "./userCardMeaningRepository";
import type { Rating, State } from "ts-fsrs";
import { userCardMeaningReviewTable } from "../../schemas/user/userCardMeaningReview";
import { db } from "../../../config/db";
import {
  getPagination,
  validateUpdate,
  type PaginationOptions,
} from "../queryUtils";

export type UserCardMeaningReview =
  typeof userCardMeaningReviewTable.$inferSelect;
export type NewUserCardMeaningReview = Omit<
  typeof userCardMeaningReviewTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserCardMeaningReview = Partial<
  Omit<
    NewUserCardMeaningReview,
    "userId" | "cardMeaningId" | "userCardMeaningId"
  >
>;

export interface UserCardMeaningReviewFilters {
  userId?: number;
  cardMeaningId?: number;
  userCardMeaningId?: number;
  rating?: Rating;
  state?: State;
  reviewFrom?: Date;
  reviewTo?: Date;
}

export type UserCardMeaningReviewQuery = UserCardMeaningReviewFilters &
  PaginationOptions;

function getUserCardMeaningReviewConditions(
  filters: UserCardMeaningReviewFilters,
) {
  return and(
    filters.userId !== undefined
      ? eq(userCardMeaningReviewTable.userId, filters.userId)
      : undefined,
    filters.cardMeaningId !== undefined
      ? eq(userCardMeaningReviewTable.cardMeaningId, filters.cardMeaningId)
      : undefined,
    filters.userCardMeaningId !== undefined
      ? eq(
          userCardMeaningReviewTable.userCardMeaningId,
          filters.userCardMeaningId,
        )
      : undefined,
    filters.rating !== undefined
      ? eq(userCardMeaningReviewTable.rating, filters.rating)
      : undefined,
    filters.state !== undefined
      ? eq(userCardMeaningReviewTable.state, filters.state)
      : undefined,
    filters.reviewFrom !== undefined
      ? gte(userCardMeaningReviewTable.review, filters.reviewFrom)
      : undefined,
    filters.reviewTo !== undefined
      ? lt(userCardMeaningReviewTable.review, filters.reviewTo)
      : undefined,
  );
}

export async function getUserCardMeaningReviewById(id: number) {
  try {
    const rows = await db
      .select()
      .from(userCardMeaningReviewTable)
      .where(eq(userCardMeaningReviewTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching userCardMeaningReview by ID:", error);
    throw error;
  }
}

export async function getUserCardMeaningReviews(
  options: UserCardMeaningReviewQuery = {},
) {
  try {
    const { limit, offset } = getPagination(options);
    return await db
      .select()
      .from(userCardMeaningReviewTable)
      .where(getUserCardMeaningReviewConditions(options))
      .orderBy(
        desc(userCardMeaningReviewTable.review),
        desc(userCardMeaningReviewTable.id),
      )
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error fetching UserCardMeaningReviews:", error);
    throw error;
  }
}

export async function countUserCardMeaningReviews(
  filters: UserCardMeaningReviewFilters = {},
) {
  try {
    return await db.$count(
      userCardMeaningReviewTable,
      getUserCardMeaningReviewConditions(filters),
    );
  } catch (error) {
    console.error("Error counting UserCardMeaningReviews:", error);
    throw error;
  }
}

export async function createUserCardMeaningReview(
  data: NewUserCardMeaningReview,
): Promise<UserCardMeaningReview> {
  try {
    const rows = await db
      .insert(userCardMeaningReviewTable)
      .values(data)
      .returning();
    return rows[0]!;
  } catch (error) {
    console.error("Error creating userCardMeaningReview:", error);
    throw error;
  }
}

export async function updateUserCardMeaningReview(
  id: number,
  data: UpdateUserCardMeaningReview,
) {
  try {
    validateUpdate(data, ["userId", "cardMeaningId", "userCardMeaningId"]);
    const rows = await db
      .update(userCardMeaningReviewTable)
      .set(data)
      .where(eq(userCardMeaningReviewTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error updating userCardMeaningReview:", error);
    throw error;
  }
}

export async function deleteUserCardMeaningReview(id: number) {
  try {
    const rows = await db
      .delete(userCardMeaningReviewTable)
      .where(eq(userCardMeaningReviewTable.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error deleting userCardMeaningReview:", error);
    throw error;
  }
}

export type NewReviewLog = Omit<
  NewUserCardMeaningReview,
  "userId" | "cardMeaningId" | "userCardMeaningId"
>;
export type ReviewProgress = Omit<
  NewUserCardMeaning,
  "userId" | "cardMeaningId" | "lastReview"
> & {
  lastReview: Date;
};

export async function getLatestUserCardMeaningReview(
  userCardMeaningId: number,
) {
  try {
    const rows = await db
      .select()
      .from(userCardMeaningReviewTable)
      .where(
        eq(userCardMeaningReviewTable.userCardMeaningId, userCardMeaningId),
      )
      .orderBy(
        desc(userCardMeaningReviewTable.review),
        desc(userCardMeaningReviewTable.id),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching latest card meaning review:", error);
    throw error;
  }
}

export async function recordUserCardMeaningReview(
  userCardMeaningId: number,
  progress: ReviewProgress,
  review: NewReviewLog,
) {
  try {
    validateUpdate(progress, ["userId", "cardMeaningId"]);
    // node:sqlite uses synchronous transaction callbacks; each statement executes with .get().
    return db.transaction((tx) => {
      const existing = tx
        .select()
        .from(userCardMeaningTable)
        .where(eq(userCardMeaningTable.id, userCardMeaningId))
        .get();
      if (!existing) return null;

      const updated = tx
        .update(userCardMeaningTable)
        .set(progress)
        .where(eq(userCardMeaningTable.id, userCardMeaningId))
        .returning()
        .get()!;
      const log = tx
        .insert(userCardMeaningReviewTable)
        .values({
          ...review,
          userId: existing.userId,
          cardMeaningId: existing.cardMeaningId,
          userCardMeaningId: existing.id,
        })
        .returning()
        .get()!;
      return { progress: updated, review: log };
    });
  } catch (error) {
    console.error("Error recording card meaning review:", error);
    throw error;
  }
}
