import type { DataPack, ExpansionId, MapTemplate } from '../domain/types';
import base from './packs/base.json';
import pok from './packs/pok.json';
import te from './packs/te.json';

const PACKS: Record<ExpansionId, unknown> = { pok, te };
const MECATOL_BASE = '18';
const MECATOL_TE = '112';

/** A later pack's template for a player count replaces an earlier one. */
function mergeTemplates(packs: DataPack[]): MapTemplate[] {
  const byCount = new Map<number, MapTemplate>();
  for (const pack of packs) for (const template of pack.templates) byCount.set(template.playerCount, template);
  return [...byCount.values()].sort((a, b) => a.playerCount - b.playerCount);
}

/** Thunder's Edge replaces the base Mecatol Rex tile with its own. */
function withTeMecatol(template: MapTemplate): MapTemplate {
  return {
    ...template,
    slots: template.slots.map(slot => (slot.fixed === MECATOL_BASE ? { ...slot, fixed: MECATOL_TE } : slot)),
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
  };
}
