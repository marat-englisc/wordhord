import * as decks from "../../db/repositories/card/deckRepository";
import * as cards from "../../db/repositories/card/cardRepository";
import * as meanings from "../../db/repositories/card/cardMeaningRepository";
import * as examples from "../../db/repositories/card/cardExampleRepository";
import * as attributes from "../../db/repositories/card/attributeRepository";
import * as links from "../../db/repositories/card/cardMeaningAttributeRepository";
import * as rules from "../../db/repositories/grammar/ruleRepository";
import * as sections from "../../db/repositories/grammar/ruleSectionRepository";
import * as infos from "../../db/repositories/grammar/ruleSectionPrimaryInfoRepository";
import * as ruleExamples from "../../db/repositories/grammar/ruleSectionExampleRepository";
import * as images from "../../db/repositories/grammar/ruleImageRepository";
import { discardUnusedAudio } from "../audio";

export type EntityKey = "deck" | "card" | "meaning" | "example" | "attribute" | "link" | "rule" | "section" | "info" | "ruleExample" | "image";
export type EntityRow = { id: number } & Record<string, unknown>;
export interface Field { key: string; label: string; kind?: "order" | "attribute" | "image"; optional?: boolean; max?: number; }
export interface Entity {
  title: string;
  singular: string;
  labelKey: string;
  fields: Field[];
  parent?: { entity: EntityKey; key: string };
  children?: EntityKey[];
  get(id: number): Promise<EntityRow | null>;
  list(options: Record<string, number>): Promise<EntityRow[]>;
  count(options: Record<string, number>): Promise<number>;
  create(data: Record<string, unknown>): Promise<EntityRow>;
  update(id: number, data: Record<string, unknown>): Promise<EntityRow | null>;
  remove(id: number): Promise<EntityRow | null>;
}

// A single checked form boundary adapts the existing, strongly typed repositories.
function entity<T extends { id: number }, N extends object>(
  description: Omit<Entity, "get" | "list" | "count" | "create" | "update" | "remove">,
  get: (id: number) => Promise<T | null>, list: (options: Record<string, number>) => Promise<T[]>,
  count: (options: Record<string, number>) => Promise<number>, create: (data: N) => Promise<T>,
  update: (id: number, data: Partial<N>) => Promise<T | null>, remove: (id: number) => Promise<T | null>,
): Entity {
  const row = (value: T): EntityRow => value as EntityRow;
  return { ...description, get: async (id) => { const value = await get(id); return value ? row(value) : null; },
    list: async (options) => (await list(options)).map(row), count,
    create: async (data) => row(await create(data as N)),
    update: async (id, data) => { const value = await update(id, data as Partial<N>); return value ? row(value) : null; },
    remove: async (id) => { const value = await remove(id); return value ? row(value) : null; },
  };
}

const name: Field = { key: "name", label: "Название", max: 160 };
const order: Field = { key: "order", label: "Порядок (0, 1, 2…)", kind: "order" };
const exampleFields: Field[] = [{ key: "example", label: "Пример на английском", max: 2000 }, { key: "exampleTranslation", label: "Перевод примера", max: 2000 }];

export const entities: Record<EntityKey, Entity> = {
  deck: entity({ title: "Колоды", singular: "Колода", labelKey: "name", fields: [name], children: ["card"] }, decks.getDeckById, decks.getDecks, decks.countDecks, decks.createDeck, decks.updateDeck, decks.deleteDeck),
  card: entity({ title: "Слова", singular: "Слово", labelKey: "title", parent: { entity: "deck", key: "deckId" }, fields: [{ key: "title", label: "Слово на английском", max: 160 }, { key: "transcription", label: "Транскрипция", optional: true, max: 160 }], children: ["meaning"] }, cards.getCardById, cards.getCards, cards.countCards, cards.createCard, cards.updateCard, async (id) => { const card = await cards.deleteCard(id); if (card) await discardUnusedAudio(card.audioUrl); return card; }),
  meaning: entity({ title: "Значения", singular: "Значение", labelKey: "meaningTranslation", parent: { entity: "card", key: "cardId" }, fields: [{ key: "meaning", label: "Определение на английском", max: 3000 }, { key: "meaningTranslation", label: "Перевод / значение на русском", max: 2000 }, { key: "hint", label: "Подсказка для лицевой стороны карточки", optional: true, max: 500 }], children: ["example", "link"] }, meanings.getCardMeaningById, meanings.getCardMeanings, meanings.countCardMeanings, meanings.createCardMeaning, meanings.updateCardMeaning, meanings.deleteCardMeaning),
  example: entity({ title: "Примеры", singular: "Пример", labelKey: "example", parent: { entity: "meaning", key: "cardMeaningId" }, fields: exampleFields }, examples.getCardExampleById, examples.getCardExamples, examples.countCardExamples, examples.createCardExample, examples.updateCardExample, examples.deleteCardExample),
  attribute: entity({ title: "Справочник атрибутов", singular: "Атрибут", labelKey: "name", fields: [name] }, attributes.getAttributeById, attributes.getAttributes, attributes.countAttributes, attributes.createAttribute, attributes.updateAttribute, attributes.deleteAttribute),
  link: entity({ title: "Атрибуты значения", singular: "Атрибут значения", labelKey: "value", parent: { entity: "meaning", key: "cardMeaningId" }, fields: [{ key: "attributeId", label: "Выбери атрибут", kind: "attribute" }, { key: "value", label: "Значение атрибута", max: 500 }] }, links.getCardMeaningAttributeById, links.getCardMeaningAttributes, links.countCardMeaningAttributes, links.createCardMeaningAttribute, links.updateCardMeaningAttribute, links.deleteCardMeaningAttribute),
  rule: entity({ title: "Грамматика", singular: "Правило", labelKey: "name", fields: [name, order], children: ["section", "image"] }, rules.getRuleById, rules.getRules, rules.countRules, rules.createRule, rules.updateRule, rules.deleteRule),
  section: entity({ title: "Разделы", singular: "Раздел", labelKey: "title", parent: { entity: "rule", key: "ruleId" }, fields: [{ key: "title", label: "Заголовок раздела", max: 160 }, { key: "content", label: "Текст раздела", max: 12000 }, order], children: ["info", "ruleExample"] }, sections.getRuleSectionById, sections.getRuleSections, sections.countRuleSections, sections.createRuleSection, sections.updateRuleSection, sections.deleteRuleSection),
  info: entity({ title: "Ключевые мысли", singular: "Ключевая мысль", labelKey: "content", parent: { entity: "section", key: "ruleSectionId" }, fields: [{ key: "content", label: "Текст ключевой мысли", max: 8000 }, order] }, infos.getRuleSectionPrimaryInfoById, infos.getRuleSectionPrimaryInfos, infos.countRuleSectionPrimaryInfos, infos.createRuleSectionPrimaryInfo, infos.updateRuleSectionPrimaryInfo, infos.deleteRuleSectionPrimaryInfo),
  ruleExample: entity({ title: "Примеры", singular: "Пример", labelKey: "example", parent: { entity: "section", key: "ruleSectionId" }, fields: [...exampleFields, order] }, ruleExamples.getRuleSectionExampleById, ruleExamples.getRuleSectionExamples, ruleExamples.countRuleSectionExamples, ruleExamples.createRuleSectionExample, ruleExamples.updateRuleSectionExample, ruleExamples.deleteRuleSectionExample),
  image: entity({ title: "Иллюстрации", singular: "Иллюстрация", labelKey: "imageUrl", parent: { entity: "rule", key: "ruleId" }, fields: [{ key: "imageUrl", label: "Пришли фото или HTTPS-ссылку на изображение", kind: "image", max: 2000 }, order] }, images.getRuleImageById, images.getRuleImages, images.countRuleImages, images.createRuleImage, images.updateRuleImage, images.deleteRuleImage),
};

export interface AdminForm {
  entity: EntityKey;
  id?: number;
  parentId: number;
  token: string;
  field: number;
  single: boolean;
  values: Record<string, unknown>;
  ready?: boolean;
  audio?: boolean;
  textDraft?: string;
}
