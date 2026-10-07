import {
  and, asc, count, eq, getColumns, gt, inArray, isNull, lte, ne, notInArray, or,
} from "drizzle-orm";
import { State } from "ts-fsrs";
import { cardTable } from "../../schemas/card/card";
import { cardMeaningTable } from "../../schemas/card/cardMeaning";
import { deckTable } from "../../schemas/card/deck";
import { userDeckTable } from "../../schemas/user/userDeck";
import { userCardMeaningTable } from "../../schemas/user/userCardMeaning";
import type { StudyReadDatabase } from "./types";

export function studyCandidateQuery(database: StudyReadDatabase, userId: number) {
  return database.select({
    card: getColumns(cardTable),
    meaning: getColumns(cardMeaningTable),
    deck: getColumns(deckTable),
    progress: getColumns(userCardMeaningTable),
  }).from(cardMeaningTable)
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .innerJoin(deckTable, eq(cardTable.deckId, deckTable.id))
    .innerJoin(userDeckTable, and(
      eq(userDeckTable.deckId, deckTable.id), eq(userDeckTable.userId, userId),
    ))
    .leftJoin(userCardMeaningTable, and(
      eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
      eq(userCardMeaningTable.userId, userId),
    )).$dynamic();
}

function newMeaningCondition(now: Date) {
  return or(isNull(userCardMeaningTable.id), and(
    eq(userCardMeaningTable.state, State.New), lte(userCardMeaningTable.due, now),
  ));
}

function newCardIdsQuery(database: StudyReadDatabase, userId: number) {
  return database.selectDistinct({ id: cardTable.id }).from(cardTable)
    .innerJoin(cardMeaningTable, eq(cardMeaningTable.cardId, cardTable.id))
    .leftJoin(userCardMeaningTable, and(
      eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id),
      eq(userCardMeaningTable.userId, userId),
    )).$dynamic();
}

function activeProgressQuery(database: StudyReadDatabase, userId: number) {
  return database.select({ due: userCardMeaningTable.due }).from(userCardMeaningTable)
    .innerJoin(cardMeaningTable, eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id))
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .innerJoin(userDeckTable, and(
      eq(userDeckTable.deckId, cardTable.deckId), eq(userDeckTable.userId, userId),
    )).$dynamic();
}

export function countDueReviews(database: StudyReadDatabase, userId: number, now: Date) {
  return database.select({ count: count() }).from(userCardMeaningTable)
    .innerJoin(cardMeaningTable, eq(userCardMeaningTable.cardMeaningId, cardMeaningTable.id))
    .innerJoin(cardTable, eq(cardMeaningTable.cardId, cardTable.id))
    .innerJoin(userDeckTable, and(
      eq(userDeckTable.deckId, cardTable.deckId), eq(userDeckTable.userId, userId),
    ))
    .where(and(
      eq(userCardMeaningTable.userId, userId),
      eq(userCardMeaningTable.state, State.Review), lte(userCardMeaningTable.due, now),
    )).get()!.count;
}

export function readStudyCandidates(
  database: StudyReadDatabase,
  userId: number,
  now: Date,
  deckId: number | undefined,
  selectedDeckIds: number[],
  newPerDeckLimit: number,
  avoid: readonly number[],
) {
  const selectedDeck = deckId === undefined ? undefined : eq(deckTable.id, deckId);
  // Rank the entire ready debt in the core: a due-based SQL LIMIT would discard
  // cards with higher forgetting risk before that ranking can happen.
  const due = studyCandidateQuery(database, userId)
    .where(and(ne(userCardMeaningTable.state, State.New), lte(userCardMeaningTable.due, now), selectedDeck))
    .orderBy(asc(userCardMeaningTable.due), asc(cardMeaningTable.id)).all();
  const newCards = newPerDeckLimit === 0 ? [] : selectedDeckIds.flatMap((selectedDeckId) => {
    // Bound words, not meanings: many siblings cannot crowd out other words.
    const preferred = newCardIdsQuery(database, userId)
      .where(and(
        eq(cardTable.deckId, selectedDeckId), newMeaningCondition(now),
        avoid.length > 0 ? notInArray(cardTable.id, [...avoid]) : undefined,
      )).orderBy(asc(cardTable.id)).limit(newPerDeckLimit).all().map((card) => card.id);
    const fallback = preferred.length < newPerDeckLimit && avoid.length > 0
      ? newCardIdsQuery(database, userId)
        .where(and(eq(cardTable.deckId, selectedDeckId), newMeaningCondition(now), inArray(cardTable.id, [...avoid])))
        .orderBy(asc(cardTable.id)).limit(newPerDeckLimit - preferred.length).all().map((card) => card.id)
      : [];
    const cardIds = [...preferred, ...fallback];
    return cardIds.length === 0 ? [] : studyCandidateQuery(database, userId)
      .where(and(eq(deckTable.id, selectedDeckId), inArray(cardTable.id, cardIds), newMeaningCondition(now)))
      .orderBy(asc(cardTable.id), asc(cardMeaningTable.id)).all();
  });
  // A future wake-up needs just its timestamp, not full dictionary hydration.
  const nextDueAt = activeProgressQuery(database, userId)
    .where(and(
      eq(userCardMeaningTable.userId, userId), gt(userCardMeaningTable.due, now),
      deckId === undefined ? undefined : eq(cardTable.deckId, deckId),
    )).orderBy(asc(userCardMeaningTable.due), asc(cardMeaningTable.id)).limit(1).get()?.due ?? null;
  return { due, newCards, nextDueAt };
}
