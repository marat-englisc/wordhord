import {
  and,
  asc,
  count,
  desc,
  eq,
  getColumns,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
} from "drizzle-orm";
import { State } from "ts-fsrs";
import { db } from "../../config/db";
import {
  StudyError,
  type DailyActivity,
  type StudyDay,
  type StudyRepository,
} from "../../core/fsrs/types";
import { cardTable } from "../schemas/card/card";
import { cardMeaningTable } from "../schemas/card/cardMeaning";
import { deckTable } from "../schemas/card/deck";
import { userTable } from "../schemas/user/user";
import { userDeckTable } from "../schemas/user/userDeck";
import { userCardMeaningTable } from "../schemas/user/userCardMeaning";
import { userCardMeaningReviewTable } from "../schemas/user/userCardMeaningReview";

type StudyDatabase = typeof db;
type ReadDatabase = Pick<StudyDatabase, "select" | "selectDistinct">;

function candidateQuery(database: ReadDatabase, userId: number) {
  return database
    .select({
      card: getColumns(cardTable),
      meaning: getColumns(cardMeaningTable),
      deck: getColumns(deckTable),
      progress: getColumns(userCardMeaningTable),
    })
    .from(cardMeaningTable)
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .innerJoin(deckTable, eq(cardTable.deckId, deckTable.id))
    .innerJoin(
      userDeckTable,
      and(
        eq(userDeckTable.deckId, deckTable.id),
        eq(userDeckTable.userId, userId),
      ),
    )
    .leftJoin(
      userCardMeaningTable,
      and(
        eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
        eq(userCardMeaningTable.userId, userId),
      ),
    )
    .$dynamic();
}

function readActivity(
  database: ReadDatabase,
  userId: number,
  now: Date,
  day: StudyDay,
): DailyActivity {
  const reviews = database
    .select({
      cardMeaningId: userCardMeaningReviewTable.cardMeaningId,
      state: userCardMeaningReviewTable.state,
      deckId: cardTable.deckId,
    })
    .from(userCardMeaningReviewTable)
    .innerJoin(
      cardMeaningTable,
      eq(userCardMeaningReviewTable.cardMeaningId, cardMeaningTable.id),
    )
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(
      and(
        eq(userCardMeaningReviewTable.userId, userId),
        gte(userCardMeaningReviewTable.rating, 1),
        lte(userCardMeaningReviewTable.rating, 4),
        gte(userCardMeaningReviewTable.review, day.start),
        lt(userCardMeaningReviewTable.review, day.end),
        lte(userCardMeaningReviewTable.review, now),
      ),
    )
    .orderBy(
      asc(userCardMeaningReviewTable.review),
      asc(userCardMeaningReviewTable.id),
    )
    .all();

  const introduced = new Set<number>();
  const reviewed = new Set<number>();
  let reviewsSinceLastNew = 0;
  for (const review of reviews) {
    if (review.state === State.New) {
      introduced.add(review.cardMeaningId);
      reviewsSinceLastNew = 0;
    } else if (review.state === State.Review) {
      reviewed.add(review.cardMeaningId);
      reviewsSinceLastNew += 1;
    }
  }
  // Deck rotation continues across days, even when only one new word is allowed.
  const lastIntroducedDeckId = database
    .select({ deckId: cardTable.deckId })
    .from(userCardMeaningReviewTable)
    .innerJoin(
      cardMeaningTable,
      eq(userCardMeaningReviewTable.cardMeaningId, cardMeaningTable.id),
    )
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(and(
      eq(userCardMeaningReviewTable.userId, userId),
      eq(userCardMeaningReviewTable.state, State.New),
      gte(userCardMeaningReviewTable.rating, 1),
      lte(userCardMeaningReviewTable.rating, 4),
      lte(userCardMeaningReviewTable.review, now),
    ))
    .orderBy(
      desc(userCardMeaningReviewTable.review),
      desc(userCardMeaningReviewTable.id),
    )
    .limit(1)
    .get()?.deckId ?? null;
  // Recent answers persist across study-day boundaries; only daily counters reset.
  const recentCardIds = database
    .select({ cardId: cardTable.id })
    .from(userCardMeaningReviewTable)
    .innerJoin(
      cardMeaningTable,
      eq(userCardMeaningReviewTable.cardMeaningId, cardMeaningTable.id),
    )
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(and(
      eq(userCardMeaningReviewTable.userId, userId),
      gte(userCardMeaningReviewTable.rating, 1),
      lte(userCardMeaningReviewTable.rating, 4),
      lte(userCardMeaningReviewTable.review, now),
    ))
    .orderBy(
      desc(userCardMeaningReviewTable.review),
      desc(userCardMeaningReviewTable.id),
    )
    .limit(100)
    .all()
    .reverse()
    .map((review) => review.cardId);
  return {
    introducedMeaningIds: [...introduced],
    reviewedMeaningIds: [...reviewed],
    answers: reviews.length,
    reviewsSinceLastNew,
    lastIntroducedDeckId,
    recentCardIds,
  };
}

function newMeaningCondition(now: Date) {
  return or(
    isNull(userCardMeaningTable.id),
    and(
      eq(userCardMeaningTable.state, State.New),
      lte(userCardMeaningTable.due, now),
    ),
  );
}

function newCardIdsQuery(database: ReadDatabase, userId: number) {
  return database
    .selectDistinct({ id: cardTable.id })
    .from(cardTable)
    .innerJoin(cardMeaningTable, eq(cardMeaningTable.cardId, cardTable.id))
    .leftJoin(
      userCardMeaningTable,
      and(
        eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
        eq(userCardMeaningTable.userId, userId),
      ),
    )
    .$dynamic();
}

function countDueReviews(database: ReadDatabase, userId: number, now: Date) {
  return database
    .select({ count: count() })
    .from(userCardMeaningTable)
    .innerJoin(
      cardMeaningTable,
      eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
    )
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .innerJoin(
      userDeckTable,
      and(
        eq(userDeckTable.deckId, cardTable.deckId),
        eq(userDeckTable.userId, userId),
      ),
    )
    .where(
      and(
        eq(userCardMeaningTable.userId, userId),
        eq(userCardMeaningTable.state, State.Review),
        lte(userCardMeaningTable.due, now),
      ),
    )
    .get()!.count;
}

/** Synchronous SQLite queries keep queue reads and review writes consistent. */
export function createStudyRepository(database: StudyDatabase = db): StudyRepository {
  return {
    loadSnapshot(userId, now, day, deckId, newPerDeckLimit, preferences = {}) {
      try {
        if (!Number.isSafeInteger(newPerDeckLimit) || newPerDeckLimit < 0) {
          throw new RangeError("newPerDeckLimit must be a non-negative safe integer");
        }
        const spacing = preferences.siblingSpacing ?? 3;
        if (!Number.isSafeInteger(spacing) || spacing < 0) {
          throw new RangeError("siblingSpacing must be a non-negative safe integer");
        }
        return database.transaction((tx) => {
          const userExists = Boolean(
            tx.select({ id: userTable.id }).from(userTable)
              .where(eq(userTable.id, userId)).get(),
          );
          const activeDeckIds = tx
            .select({ deckId: userDeckTable.deckId })
            .from(userDeckTable)
            .where(eq(userDeckTable.userId, userId))
            .orderBy(asc(userDeckTable.deckId))
            .all()
            .map((row) => row.deckId);
          const selectedDeckIds = deckId === undefined
            ? activeDeckIds
            : activeDeckIds.filter((activeDeckId) => activeDeckId === deckId);
          const selectedDeck = deckId === undefined
            ? undefined
            : eq(deckTable.id, deckId);
          const activity = readActivity(tx, userId, now, day);
          const avoid = spacing === 0 ? [] : (
            preferences.recentCardIds ?? activity.recentCardIds ?? []
          ).slice(-spacing);
          const due = candidateQuery(tx, userId)
            .where(
              and(
                ne(userCardMeaningTable.state, State.New),
                lte(userCardMeaningTable.due, now),
                selectedDeck,
              ),
            )
            .orderBy(asc(userCardMeaningTable.due), asc(cardMeaningTable.id))
            .all();
          const newCards = newPerDeckLimit === 0 ? [] : selectedDeckIds.flatMap(
            (selectedDeckId) => {
              // Limit words, not meanings: one word with many meanings must not
              // crowd unrelated words out of the bounded candidate pool.
              const preferred = newCardIdsQuery(tx, userId)
                .where(and(
                  eq(cardTable.deckId, selectedDeckId),
                  newMeaningCondition(now),
                  avoid.length > 0 ? notInArray(cardTable.id, avoid) : undefined,
                ))
                .orderBy(asc(cardTable.id))
                .limit(newPerDeckLimit)
                .all()
                .map((card) => card.id);
              const fallback = preferred.length < newPerDeckLimit && avoid.length > 0
                ? newCardIdsQuery(tx, userId)
                  .where(and(
                    eq(cardTable.deckId, selectedDeckId),
                    newMeaningCondition(now),
                    inArray(cardTable.id, avoid),
                  ))
                  .orderBy(asc(cardTable.id))
                  .limit(newPerDeckLimit - preferred.length)
                  .all()
                  .map((card) => card.id)
                : [];
              const cardIds = [...preferred, ...fallback];
              return cardIds.length === 0 ? [] : candidateQuery(tx, userId)
                .where(and(
                  eq(deckTable.id, selectedDeckId),
                  inArray(cardTable.id, cardIds),
                  newMeaningCondition(now),
                ))
                .orderBy(asc(cardTable.id), asc(cardMeaningTable.id))
                .all();
            },
          );
          const next = candidateQuery(tx, userId)
            .where(
              and(
                gt(userCardMeaningTable.due, now),
                selectedDeck,
              ),
            )
            .orderBy(asc(userCardMeaningTable.due), asc(cardMeaningTable.id))
            .limit(1)
            .get();
          return {
            userExists,
            activeDeckIds,
            due,
            newCards,
            dueReviewCount: countDueReviews(tx, userId, now),
            nextDueAt: next?.progress?.due ?? null,
            activity,
          };
        });
      } catch (error) {
        console.error("Error loading study snapshot:", error);
        throw error;
      }
    },

    getCandidate(userId, cardMeaningId) {
      try {
        return candidateQuery(database, userId)
          .where(eq(cardMeaningTable.id, cardMeaningId))
          .get() ?? null;
      } catch (error) {
        console.error("Error fetching study candidate:", error);
        throw error;
      }
    },

    commitReview(userId, cardMeaningId, now, day, apply) {
      try {
        return database.transaction((tx) => {
          const candidate = candidateQuery(tx, userId)
            .where(eq(cardMeaningTable.id, cardMeaningId))
            .get();
          if (!candidate) {
            throw new StudyError("CARD_NOT_AVAILABLE", "Card is not in an active user deck");
          }
          const scheduled = apply({
            candidate,
            activity: readActivity(tx, userId, now, day),
            dueReviewCount: countDueReviews(tx, userId, now),
          });
          // Pick FSRS fields explicitly: identity always comes from this transaction.
          const progressData = {
            due: scheduled.progress.due,
            stability: scheduled.progress.stability,
            difficulty: scheduled.progress.difficulty,
            elapsedDays: scheduled.progress.elapsedDays,
            scheduledDays: scheduled.progress.scheduledDays,
            learningSteps: scheduled.progress.learningSteps,
            reps: scheduled.progress.reps,
            lapses: scheduled.progress.lapses,
            state: scheduled.progress.state,
            lastReview: scheduled.progress.lastReview,
          };
          const progress = candidate.progress
            ? tx.update(userCardMeaningTable)
              .set(progressData)
              .where(eq(userCardMeaningTable.id, candidate.progress.id))
              .returning().get()!
            : tx.insert(userCardMeaningTable)
              .values({ ...progressData, userId, cardMeaningId })
              .returning().get()!;
          const review = tx.insert(userCardMeaningReviewTable)
            .values({
              userId,
              cardMeaningId,
              userCardMeaningId: progress.id,
              rating: scheduled.review.rating,
              state: scheduled.review.state,
              due: scheduled.review.due,
              stability: scheduled.review.stability,
              difficulty: scheduled.review.difficulty,
              scheduledDays: scheduled.review.scheduledDays,
              elapsedDays: scheduled.review.elapsedDays,
              lastElapsedDays: scheduled.review.lastElapsedDays,
              learningSteps: scheduled.review.learningSteps,
              review: scheduled.review.review,
            })
            .returning().get()!;
          tx.update(userDeckTable)
            .set({ lastReviewedAt: now })
            .where(and(
              eq(userDeckTable.userId, userId),
              eq(userDeckTable.deckId, candidate.deck.id),
            ))
            .run();
          return { progress, review };
        }, { behavior: "immediate" });
      } catch (error) {
        console.error("Error committing study review:", error);
        throw error;
      }
    },
  };
}
