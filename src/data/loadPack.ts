import { strategyCardSet, type StrategyCard, type StrategyCardSetId } from '../domain/cards';
import { LAYOUT_ORDER } from '../domain/layouts';
import { MECATOL_TILE, MECATOL_TILE_TE } from '../domain/mecatol';
import type { ComponentDef, DataPack, ExpansionId, MapTemplate } from '../domain/types';
import base from './packs/base.json';
import pok from './packs/pok.json';
import strategyCardSets from './packs/strategyCards.json';
import te from './packs/te.json';
import baseTexts from './texts/base.json';
import pokTexts from './texts/pok.json';
import teTexts from './texts/te.json';
import baseTextsRu from './texts/base.ru.json';
import pokTextsRu from './texts/pok.ru.json';
import teTextsRu from './texts/te.ru.json';

const PACKS: Record<ExpansionId, unknown> = { pok, te };
/** Printed texts by component id, one file per expansion: they are loaded with the data of that expansion. */
const TEXTS: Record<ExpansionId, Record<string, string>> = { pok: pokTexts, te: teTexts };
/**
 * The same texts in Russian: translations with the terms of the Russian Rules Reference, names left in English
 * (docs/phase3/ru-glossary-*.md). A text with no translation is shown as printed.
 */
const TEXTS_RU: Record<ExpansionId, Record<string, string>> = { pok: pokTextsRu, te: teTextsRu };

export type TextLanguage = 'en' | 'ru';
let textLanguage: TextLanguage = 'en';
/** The language the texts of components are loaded in from now on; the interface sets it with its own. */
export function setTextLanguage(language: TextLanguage): void {
  textLanguage = language;
}
/** A pack as its file holds it: the components without their texts, which lie in `texts/`. */
type StoredPack = Omit<DataPack, 'components' | 'texts'> & { components: Omit<ComponentDef, 'text'>[] };

/** A later pack's template for a player count and layout replaces an earlier one; layouts go in `LAYOUT_ORDER`. */
function mergeTemplates(packs: StoredPack[]): MapTemplate[] {
  const byKey = new Map<string, MapTemplate>();
  for (const pack of packs) for (const template of pack.templates) byKey.set(`${template.playerCount}-${template.layout}`, template);
  return [...byKey.values()].sort((a, b) => a.playerCount - b.playerCount || LAYOUT_ORDER.indexOf(a.layout) - LAYOUT_ORDER.indexOf(b.layout));
}

/** Thunder's Edge replaces the base Mecatol Rex tile with its own. */
function withTeMecatol(template: MapTemplate): MapTemplate {
  return {
    ...template,
    slots: template.slots.map(slot => (slot.fixed === MECATOL_TILE ? { ...slot, fixed: MECATOL_TILE_TE } : slot)),
  };
}

/** Texts and components of a set of expansions: the same objects on every load, as they are large and never edited. */
const CATALOGS = new Map<string, Pick<DataPack, 'components' | 'texts' | 'originalTexts'>>();

function catalogOf(on: ExpansionId[], packs: StoredPack[], language: TextLanguage): Pick<DataPack, 'components' | 'texts' | 'originalTexts'> {
  const key = `${language}:${on.join(',')}`;
  let catalog = CATALOGS.get(key);
  if (!catalog) {
    const texts: Record<string, string> = Object.assign({}, baseTexts, ...on.map(id => TEXTS[id]), ...(language === 'ru' ? [baseTextsRu, ...on.map(id => TEXTS_RU[id])] : []));
    const originalTexts = language === 'en' ? undefined : catalogOf(on, packs, 'en').texts;
    catalog = { texts, ...(originalTexts ? { originalTexts } : {}), components: packs.flatMap(pack => pack.components).map(component => ({ ...component, text: texts[component.id] ?? '' })) };
    CATALOGS.set(key, catalog);
  }
  return catalog;
}

/** The data of a set of expansions; the texts of components in the given language, by default the one the interface has set. */
export function loadPack(expansions: ExpansionId[], language: TextLanguage = textLanguage): DataPack {
  const order: ExpansionId[] = ['pok', 'te'];
  const on = order.filter(id => expansions.includes(id));
  const packs = [base as unknown, ...on.map(id => PACKS[id])] as StoredPack[];
  const templates = mergeTemplates(packs);
  return {
    version: packs[0].version,
    tiles: Object.assign({}, ...packs.map(pack => pack.tiles)),
    planets: Object.assign({}, ...packs.map(pack => pack.planets)),
    units: Object.assign({}, ...packs.map(pack => pack.units)),
    factions: Object.assign({}, ...packs.map(pack => pack.factions)),
    templates: expansions.includes('te') ? templates.map(withTeMecatol) : templates,
    technologies: Object.assign({}, ...packs.map(pack => pack.technologies)),
    structures: packs.flatMap(pack => pack.structures),
    ...catalogOf(on, packs, language),
  };
}

/** The strategy cards of the set the expansions choose, in initiative order. */
export function strategyCards(expansions: ExpansionId[]): StrategyCard[] {
  return (strategyCardSets as Record<StrategyCardSetId, StrategyCard[]>)[strategyCardSet(expansions)];
}
