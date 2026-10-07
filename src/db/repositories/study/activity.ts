import { and, asc, desc, eq, gte, lt, lte } from "drizzle-orm";
import { State } from "ts-fsrs";
import type { DailyActivity, StudyDay } from "../../../core/fsrs/types";
import { cardTable } from "../../schemas/card/card";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { userCardMeaningReviewTable as reviewsTable } from "../../schemas/user/userCardMeaningReview";
import type { StudyReadDatabase } from "./types";

export function readStudyActivity(
  database: StudyReadDatabase,
  userId: number,
  now: Date,
  day: StudyDay,
): DailyActivity {
  const answered = and(
    eq(reviewsTable.userId, userId),
    gte(reviewsTable.rating, 1),
    lte(reviewsTable.rating, 4),
    lte(reviewsTable.review, now),
  );
  // The review's FK and content-deletion triggers already protect its identity.
  // Counting the journal does not require loading dictionary rows.
  const reviews = database.select({
    cardMeaningId: reviewsTable.cardMeaningId,
    state: reviewsTable.state,
  }).from(reviewsTable)
    .where(and(answered, gte(reviewsTable.review, day.start), lt(reviewsTable.review, day.end)))
    .orderBy(asc(reviewsTable.review), asc(reviewsTable.id))
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
      reviewsSinceLastNew++;
    }
  }

  // Deck rotation and sibling history continue across local-day boundaries.
  const lastIntroducedDeckId = database.select({ deckId: cardTable.deckId })
    .from(reviewsTable)
    .innerJoin(cardMeaningTable, eq(reviewsTable.cardMeaningId, cardMeaningTable.id))
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(and(answered, eq(reviewsTable.state, State.New)))
    .orderBy(desc(reviewsTable.review), desc(reviewsTable.id))
    .limit(1).get()?.deckId ?? null;
  const recentCardIds = database.select({ cardId: cardTable.id })
    .from(reviewsTable)
    .innerJoin(cardMeaningTable, eq(reviewsTable.cardMeaningId, cardMeaningTable.id))
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .where(answered)
    .orderBy(desc(reviewsTable.review), desc(reviewsTable.id))
    .limit(100).all().reverse().map((review) => review.cardId);

  return {
    introducedMeaningIds: [...introduced],
    reviewedMeaningIds: [...reviewed],
    answers: reviews.length,
    reviewsSinceLastNew,
    lastIntroducedDeckId,
    recentCardIds,
  };
}
