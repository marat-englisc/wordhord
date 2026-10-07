import type { Context } from "grammy";
import type { User } from "../db/repositories/user/userRepository";
import type { StudyItem, StudyService } from "../core/fsrs";
import type { AdminForm, EntityKey } from "./admin/entities";

export interface BotState {
  touchedAt: number;
  study?: { item: StudyItem; token: string; revealed: boolean; deckId?: number; messageId?: number; answered: number };
  form?: AdminForm;
  deletion?: { entity: EntityKey; id: number; token: string };
  note?: { ruleId: number };
  search?: { scope: "decks" | "rules" };
  query?: { scope: "decks" | "rules"; text: string };
}

export type BotContext = Context & { app: { user: User; state: BotState; study: StudyService; timeZone: string } };

export function clearFlow(state: BotState): void {
  delete state.study;
  delete state.form;
  delete state.deletion;
  delete state.note;
  delete state.search;
}

export class UserInputError extends Error {}
