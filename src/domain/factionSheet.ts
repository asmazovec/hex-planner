import type { ExpansionId, FactionDef, FactionSheet, SheetItem } from './types';

const LEADER_ORDER = { agent: 0, commander: 1, hero: 2 };

const inPlay = (item: SheetItem, expansions: ExpansionId[]): boolean => item.pack === 'base' || expansions.includes(item.pack);

/** Items of the expansions in play, without those a newer one takes the place of. */
function current<T extends SheetItem>(items: T[], expansions: ExpansionId[]): T[] {
  const present = items.filter(item => inPlay(item, expansions));
  const replaced = new Set(present.map(item => item.replaces));
  return present.filter(item => !replaced.has(item.id));
}

/**
 * What a faction has with these expansions. Leaders and mechs exist only with Prophecy of Kings: the Thunder's Edge
 * rulebook removes them without it, those of its own factions too. A breakthrough needs Thunder's Edge.
 */
export function factionSheet(faction: FactionDef, expansions: ExpansionId[]): FactionSheet {
  const sheet = faction.sheet;
  if (!sheet) return { abilities: [], leaders: [], mechs: [] };
  const pok = expansions.includes('pok');
  const breakthrough = sheet.breakthrough && inPlay(sheet.breakthrough, expansions) ? sheet.breakthrough : undefined;
  return {
    abilities: sheet.abilities,
    leaders: pok ? current(sheet.leaders, expansions).sort((a, b) => LEADER_ORDER[a.type] - LEADER_ORDER[b.type]) : [],
    mechs: pok ? current(sheet.mechs, expansions) : [],
    ...(breakthrough ? { breakthrough } : {}),
  };
}

/**
 * Factions grouped by the expansion that brings them, in the order given: those of the base game, of Prophecy of Kings,
 * then of Thunder's Edge. `base` and `pok` are the factions of the packs without expansions and with Prophecy of Kings only.
 */
export function factionsByExpansion(
  factions: FactionDef[], base: Record<string, FactionDef>, pok: Record<string, FactionDef>,
): { expansion: 'base' | ExpansionId; list: FactionDef[] }[] {
  const groups: { expansion: 'base' | ExpansionId; list: FactionDef[] }[] = [
    { expansion: 'base', list: factions.filter(f => base[f.id]) },
    { expansion: 'pok', list: factions.filter(f => !base[f.id] && pok[f.id]) },
    { expansion: 'te', list: factions.filter(f => !base[f.id] && !pok[f.id]) },
  ];
  return groups.filter(group => group.list.length > 0);
}
