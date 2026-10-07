import { and, desc, eq, gte, lt } from "drizzle-orm";
import { userCardMeaningTable } from "../../schemas/user/userCardMeaning";
import type { NewUserCardMeaning } from "./userCardMeaningRepository";
import type { Rating, State } from "ts-fsrs";
import { userCardMeaningReviewTable } from "../../schemas/user/userCardMeaningReview";
import { getDatabase } from "../../../config/db";
import {
  mergeDefinedValues,
  validateDateWrite,
  validateProgressWrite,
  validateReviewWrite,
} from "../persistenceValidation";
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
  const rows = await getDatabase()
    .select()
    .from(userCardMeaningReviewTable)
    .where(eq(userCardMeaningReviewTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserCardMeaningReviews(
  options: UserCardMeaningReviewQuery = {},
) {
  const { limit, offset } = getPagination(options);
  return await getDatabase()
    .select()
    .from(userCardMeaningReviewTable)
    .where(getUserCardMeaningReviewConditions(options))
    .orderBy(
      desc(userCardMeaningReviewTable.review),
      desc(userCardMeaningReviewTable.id),
    )
    .limit(limit)
    .offset(offset);
}

export async function countUserCardMeaningReviews(
  filters: UserCardMeaningReviewFilters = {},
) {
  return await getDatabase().$count(
    userCardMeaningReviewTable,
    getUserCardMeaningReviewConditions(filters),
  );
}

export async function createUserCardMeaningReview(
  data: NewUserCardMeaningReview,
): Promise<UserCardMeaningReview> {
  validateReviewWrite(data);
  const rows = await getDatabase()
    .insert(userCardMeaningReviewTable)
    .values(data)
    .returning();
  return rows[0]!;
}

export async function updateUserCardMeaningReview(
  id: number,
  data: UpdateUserCardMeaningReview,
) {
  validateUpdate(data, ["userId", "cardMeaningId", "userCardMeaningId"]);
  return getDatabase().transaction((tx) => {
    const existing = tx
      .select()
      .from(userCardMeaningReviewTable)
      .where(eq(userCardMeaningReviewTable.id, id))
      .get();
    if (!existing) return null;
    validateReviewWrite(mergeDefinedValues(existing, data));
    return tx
      .update(userCardMeaningReviewTable)
      .set(data)
      .where(eq(userCardMeaningReviewTable.id, id))
      .returning()
      .get()!;
  }, { behavior: "immediate" });
}

export async function deleteUserCardMeaningReview(id: number) {
  const rows = await getDatabase()
    .delete(userCardMeaningReviewTable)
    .where(eq(userCardMeaningReviewTable.id, id))
    .returning();
  return rows[0] ?? null;
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
  const rows = await getDatabase()
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
}

export async function recordUserCardMeaningReview(
  userCardMeaningId: number,
  progress: ReviewProgress,
  review: NewReviewLog,
) {
  validateUpdate(progress, ["userId", "cardMeaningId"]);
  validateProgressWrite(progress);
  validateDateWrite(progress.lastReview, "lastReview");
  validateReviewWrite(review);
  return getDatabase().transaction((tx) => {
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
  }, { behavior: "immediate" });
}
