/** The replayed state: where it begins, and the helpers every step uses to change its counts. */
import { violation } from '../rules/registry';
import { absentHomePlanets, homePlanets, homeSlot, splitStartUnits, startingDocks } from '../strategy';
import type { DataPack, Entry, Game, GameState, RuleStep, UnitCounts, UnitId, Warning } from '../types';
import { startHoldings } from './holdings';

export type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
export type Move = TacticalEntry['moves'][number];

/** The command tokens a player starts with in each pool (LRR 20.2, setup). */
export const START_TOKENS = { tactic: 3, fleet: 3, strategy: 2 } as const;

export const unitIds = (units: UnitCounts): UnitId[] =>
  (Object.keys(units) as UnitId[]).filter(id => (units[id] ?? 0) > 0);

export function add(target: Record<string, UnitCounts>, key: string, units: UnitCounts): void {
  const bucket = (target[key] ??= {});
  for (const id of unitIds(units)) bucket[id] = (bucket[id] ?? 0) + (units[id] ?? 0);
}

/** Check: the units asked for that are not there. */
export function missingUnits(target: Record<string, UnitCounts>, key: string, units: UnitCounts, step?: RuleStep): Warning[] {
  const bucket = target[key] ?? {};
  return unitIds(units).flatMap(id => {
    const missing = (units[id] ?? 0) - (bucket[id] ?? 0);
    return missing > 0 ? [violation('unitsMissing', { where: key, unit: id, missing }, step)] : [];
  });
}

/** Effect: removes what exists, up to the request; returns what was actually removed. */
export function removeUnits(target: Record<string, UnitCounts>, key: string, units: UnitCounts): UnitCounts {
  const taken: UnitCounts = {};
  const bucket = (target[key] ??= {});
  for (const id of unitIds(units)) {
    const have = bucket[id] ?? 0;
    const got = Math.min(units[id] ?? 0, have);
    if (got > 0) {
      taken[id] = got;
      if (have > got) bucket[id] = have - got;
      else delete bucket[id];
    }
  }
  return taken;
}

/** Removes what exists, up to the request; returns what was actually removed and warns about the shortfall. */
export function take(
  target: Record<string, UnitCounts>, key: string, units: UnitCounts, warnings: Warning[], step?: RuleStep,
): UnitCounts {
  warnings.push(...missingUnits(target, key, units, step));
  return removeUnits(target, key, units);
}

/** A signed change of counts; a stack stops at nothing (the shortfall is reported) and an empty one leaves the record. */
export function shiftUnits(target: Record<string, UnitCounts>, key: string, units: UnitCounts, warnings: Warning[]): void {
  const bucket = (target[key] ??= {});
  for (const id of Object.keys(units) as UnitId[]) {
    const sum = (bucket[id] ?? 0) + (units[id] ?? 0);
    if (sum < 0) warnings.push(violation('unitsMissing', { where: key, unit: id, missing: -sum }, 'round'));
    const next = Math.max(0, sum);
    if (next > 0) bucket[id] = next;
    else delete bucket[id];
  }
}

export function initialState(game: Game, pack: DataPack): GameState {
  const faction = pack.factions[game.faction];
  const systems: Record<string, UnitCounts> = {};
  const ground: Record<string, UnitCounts> = {};
  const control: GameState['control'] = {};
  if (faction) {
    const [home] = homePlanets(game, pack);
    const split = splitStartUnits(faction.startUnits, home, pack);
    add(systems, homeSlot(game, pack) ?? faction.homeTile, split.space);
    if (home !== undefined && unitIds(split.ground).length > 0) add(ground, home, split.ground);
    for (const planetId of homePlanets(game, pack)) control[planetId] = 'me';
  }
  Object.assign(control, game.planetControl);
  for (const planetId of absentHomePlanets(game, pack)) delete control[planetId];
  return {
    systems, ground, exhausted: [], control, tokensOnMap: [],
    tradeGoods: 0, commodities: 0, ...START_TOKENS, vp: game.vp, opponentVp: Object.fromEntries(game.opponents.map(o => [o.id, o.vp])), 
    holdings: startHoldings(game.start.me, pack), laws: [], revealed: [], attachments: {},
    docks: startingDocks(game, pack), pds: { ...game.pds },
  };
}

/** A manual correction: counts change by its delta, signed. */
export function applyAdjustment(state: GameState, entry: Extract<Entry, { type: 'adjustment' }>, warnings: Warning[]): void {
  const d = entry.delta;
  state.tradeGoods += d.tradeGoods ?? 0;
  state.tactic += d.tactic ?? 0;
  state.fleet += d.fleet ?? 0;
  state.strategy += d.strategy ?? 0;
  state.vp += d.vp ?? 0;
  if (d.units) shiftUnits(state.systems, d.units.systemId, d.units.units, warnings);
  for (const [planetId, units] of Object.entries(d.ground ?? {})) shiftUnits(state.ground, planetId, units, warnings);
}
