import type { DataPack, Game, Plan, ShipLevels, ShipStats, UnitCounts, UnitId } from './types';

/** Fighters and infantry cost 0.5, so each unit type is rounded up to whole resources on its own. */
export function productionCost(units: UnitCounts, factionId: string, upgrades: UnitId[], pack: DataPack): number {
  let total = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    if ((units[id] ?? 0) > 0) total += Math.ceil((units[id] ?? 0) * (unitStats(factionId, id, upgrades.includes(id), pack)?.cost ?? 0));
  }
  return total;
}

/** The types that have stats and upgrades, in display order. */
export const SHIP_KINDS: UnitId[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];

/** A faction's own entry replaces the base entry whole; ground units and packs without levels read the unit table. */
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

/** A ship of the faction's own: its name stays English, while a common type's name is translated. */
export const isUniqueShip = (factionId: string, kind: UnitId, pack: DataPack): boolean =>
  pack.factions[factionId]?.ships?.[kind] !== undefined;

const toggled = (list: UnitId[], unit: UnitId): UnitId[] =>
  (list.includes(unit) ? list.filter(id => id !== unit) : [...list, unit]);

/** Switches a mark set by hand: my baseline for `me`, an opponent's list by id. An opponent's empty list is dropped. */
export function toggleUpgrade(game: Game, player: string, unit: UnitId): Game {
  if (player === 'me') return { ...game, upgrades: { ...game.upgrades, me: toggled(game.upgrades.me, unit) } };
  const { [player]: current = [], ...rest } = game.upgrades.opponents;
  const next = toggled(current, unit);
  return { ...game, upgrades: { ...game.upgrades, opponents: next.length > 0 ? { ...rest, [player]: next } : rest } };
}

/** The first round whose entries give each upgrade: done ones for `now`, planned ones too for `forecast`. */
export function entryUpgradeRounds(plan: Plan, filter: 'now' | 'forecast'): Partial<Record<UnitId, number>> {
  const rounds: Partial<Record<UnitId, number>> = {};
  for (const round of [...plan.rounds].sort((a, b) => a.number - b.number)) {
    for (const entry of round.entries) {
      if (entry.status === 'cancelled' || (filter === 'now' && entry.status !== 'done')) continue;
      if (entry.type !== 'strategic' && entry.type !== 'secondary') continue;
      for (const unit of entry.upgrades ?? []) rounds[unit] ??= round.number;
    }
  }
  return rounds;
}
