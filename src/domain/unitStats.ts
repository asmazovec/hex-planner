import { appliedFor } from './effects/entryApply';
import { holderFor, type Who } from './effects/registry';
import { holdingRounds, upgradesOf } from './holdings';
import type { DataPack, Entry, Plan, ShipLevels, ShipStats, StructureKind, UnitCounts, UnitId, UpgradeId } from './types';

/**
 * Fighters and infantry cost 0.5, so each unit type is rounded up to whole resources on its own. `who` is the holdings
 * (the cards held) or a `Holder` (`holderOf`: also the faction sheet, the planets controlled and the laws in play); the
 * `entry` that plays components lets their `play` modifiers of `unitCost` count (Harrugh Gefhara: 0).
 */
export function productionCost(units: UnitCounts, factionId: string, who: Who, pack: DataPack, entry?: Entry): number {
  let total = 0;
  const holder = holderFor(who, factionId);
  for (const id of Object.keys(units) as UnitId[]) {
    if ((units[id] ?? 0) <= 0) continue;
    const cost = appliedFor(pack, holder, entry, 'unitCost', unitStats(factionId, id, false, pack)?.cost ?? 0, { faction: factionId, unit: id }).value;
    total += Math.ceil((units[id] ?? 0) * cost);
  }
  return total;
}

/** The unit types that have stats and upgrades, in display order: the ships, then infantry (Infantry II). */
export const SHIP_KINDS: UnitId[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry'];

/** A faction's own entry replaces the base entry whole; ground forces and packs without levels read the unit table. */
function levelsOf(factionId: string, kind: UnitId, pack: DataPack): ShipLevels | undefined {
  const own = pack.factions[factionId]?.ships?.[kind];
  if (own) return own;
  const def = pack.units[kind];
  if (!def) return undefined;
  return def.levels ?? { one: { id: def.id, name: def.name, cost: def.cost, capacity: def.capacity, combat: def.combat, dice: 1, move: def.move } };
}

/** The numbers of a unit for a faction. An upgrade with no level II returns level I. */
export function unitStats(factionId: string, kind: UnitId, upgraded: boolean, pack: DataPack): ShipStats | undefined {
  const levels = levelsOf(factionId, kind, pack);
  return upgraded ? levels?.two ?? levels?.one : levels?.one;
}

export const hasLevelTwo = (factionId: string, kind: UnitId, pack: DataPack): boolean =>
  levelsOf(factionId, kind, pack)?.two !== undefined;

/** The structures with a second level in the pack: PDS II and Space Dock II. */
export const upgradableStructures = (pack: DataPack): StructureKind[] =>
  (['pds', 'spacedock'] as const).filter(kind => pack.structures.find(s => s.id === kind)?.levels.two !== undefined);

/** A ship of the faction's own: its name stays English, while a common type's name is translated. */
export const isUniqueShip = (factionId: string, kind: UnitId, pack: DataPack): boolean =>
  pack.factions[factionId]?.ships?.[kind] !== undefined;

/** The first round whose entries of mine research each unit upgrade: done ones for `now`, planned ones too for `forecast`. */
export function entryUpgradeRounds(plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Partial<Record<UpgradeId, number>> {
  const rounds: Partial<Record<UpgradeId, number>> = {};
  for (const [id, round] of Object.entries(holdingRounds(plan, filter).me ?? {})) {
    const [unit] = upgradesOf({ technologies: [id] }, pack);
    if (unit) rounds[unit] = Math.min(rounds[unit] ?? round, round);
  }
  return rounds;
}
