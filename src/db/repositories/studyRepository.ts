import { and, asc, eq } from "drizzle-orm";
import { getDatabase, type ApplicationDatabase } from "../../config/db";
import { StudyError, type StudyRepository } from "../../core/fsrs/types";
import { cardMeaningTable } from "../schemas/card/cardMeaning";
import { userTable } from "../schemas/user/user";
import { userDeckTable } from "../schemas/user/userDeck";
import { userCardMeaningTable } from "../schemas/user/userCardMeaning";
import { userCardMeaningReviewTable } from "../schemas/user/userCardMeaningReview";
import { validateProgressWrite, validateReviewWrite } from "./persistenceValidation";
import { readStudyActivity } from "./study/activity";
import { countDueReviews, readStudyCandidates, studyCandidateQuery } from "./study/queries";

/** The factory opens the default database only when one is actually needed. */
export function createStudyRepository(database: ApplicationDatabase = getDatabase()): StudyRepository {
  return {
    loadSnapshot(userId, now, day, deckId, newPerDeckLimit, preferences = {}) {
      if (!Number.isSafeInteger(newPerDeckLimit) || newPerDeckLimit < 0) {
        throw new RangeError("newPerDeckLimit must be a non-negative safe integer");
      }
      const spacing = preferences.siblingSpacing ?? 3;
      if (!Number.isSafeInteger(spacing) || spacing < 0) {
        throw new RangeError("siblingSpacing must be a non-negative safe integer");
      }
      // All quota, candidate and future-due reads share one SQLite snapshot.
      return database.transaction((tx) => {
        const userExists = Boolean(tx.select({ id: userTable.id }).from(userTable)
          .where(eq(userTable.id, userId)).get());
        const activeDeckIds = tx.select({ deckId: userDeckTable.deckId }).from(userDeckTable)
          .where(eq(userDeckTable.userId, userId)).orderBy(asc(userDeckTable.deckId))
          .all().map((row) => row.deckId);
        const selectedDeckIds = deckId === undefined
          ? activeDeckIds : activeDeckIds.filter((id) => id === deckId);
        const activity = readStudyActivity(tx, userId, now, day);
        const avoid = spacing === 0 ? []
          : (preferences.recentCardIds ?? activity.recentCardIds ?? []).slice(-spacing);
        return {
          userExists,
          activeDeckIds,
          ...readStudyCandidates(tx, userId, now, deckId, selectedDeckIds, newPerDeckLimit, avoid),
          dueReviewCount: countDueReviews(tx, userId, now),
          activity,
        };
      });
    },

    getCandidate(userId, cardMeaningId) {
      return studyCandidateQuery(database, userId)
        .where(eq(cardMeaningTable.id, cardMeaningId)).get() ?? null;
    },

    commitReview(userId, cardMeaningId, now, day, apply) {
      return database.transaction((tx) => {
        const candidate = studyCandidateQuery(tx, userId)
          .where(eq(cardMeaningTable.id, cardMeaningId)).get();
        if (!candidate) {
          throw new StudyError("CARD_NOT_AVAILABLE", "Card is not in an active user deck");
        }
        const scheduled = apply({
          candidate,
          activity: readStudyActivity(tx, userId, now, day),
          dueReviewCount: countDueReviews(tx, userId, now),
        });
        // Validate before either write; malformed adapter results cannot leave
        // progress or history partially persisted.
        validateProgressWrite(scheduled.progress);
        validateReviewWrite(scheduled.review);
        // Identity comes from this transaction rather than the schedule callback.
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
          ? tx.update(userCardMeaningTable).set(progressData)
            .where(eq(userCardMeaningTable.id, candidate.progress.id)).returning().get()!
          : tx.insert(userCardMeaningTable).values({ ...progressData, userId, cardMeaningId })
            .returning().get()!;
        const review = tx.insert(userCardMeaningReviewTable).values({
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
        }).returning().get()!;
        tx.update(userDeckTable).set({ lastReviewedAt: now }).where(and(
          eq(userDeckTable.userId, userId), eq(userDeckTable.deckId, candidate.deck.id),
        )).run();
        return { progress, review };
      }, { behavior: "immediate" });
    },
  };
}
