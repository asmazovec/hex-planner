import { strategyCardSet, type StrategyCard, type StrategyCardSetId } from '../domain/cards';
import { MECATOL_TILE, MECATOL_TILE_TE } from '../domain/mecatol';
import type { DataPack, ExpansionId, MapTemplate } from '../domain/types';
import base from './packs/base.json';
import pok from './packs/pok.json';
import strategyCardSets from './packs/strategyCards.json';
import te from './packs/te.json';

const PACKS: Record<ExpansionId, unknown> = { pok, te };

/** A later pack's template for a player count and layout replaces an earlier one; the standard layout comes first. */
function mergeTemplates(packs: DataPack[]): MapTemplate[] {
  const byKey = new Map<string, MapTemplate>();
  for (const pack of packs) for (const template of pack.templates) byKey.set(`${template.playerCount}-${template.layout}`, template);
  return [...byKey.values()].sort((a, b) => a.playerCount - b.playerCount || Number(a.layout !== 'standard') - Number(b.layout !== 'standard'));
}

/** Thunder's Edge replaces the base Mecatol Rex tile with its own. */
function withTeMecatol(template: MapTemplate): MapTemplate {
  return {
    ...template,
    slots: template.slots.map(slot => (slot.fixed === MECATOL_TILE ? { ...slot, fixed: MECATOL_TILE_TE } : slot)),
  };
}

export function loadPack(expansions: ExpansionId[]): DataPack {
  const order: ExpansionId[] = ['pok', 'te'];
  const packs = [base as unknown, ...order.filter(id => expansions.includes(id)).map(id => PACKS[id])] as DataPack[];
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
  };
}

/** The strategy cards of the set the expansions choose, in initiative order. */
export function strategyCards(expansions: ExpansionId[]): StrategyCard[] {
  return (strategyCardSets as Record<StrategyCardSetId, StrategyCard[]>)[strategyCardSet(expansions)];
}
