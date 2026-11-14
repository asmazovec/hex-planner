import type { Game, DataPack, UnitCounts, Entry, Warning } from '../../../../domain/types';
import type { GameState } from '../types';
import { homePlanets, splitStartUnits, homeSlot, absentHomePlanets, startingDocks, startingPds } from '../../../../domain/strategy';
import { add, unitIds, START_TOKENS, shiftUnits } from '../../../../domain/replay/state';
import { startHoldings } from './holdings';

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
    docks: startingDocks(game, pack), pds: startingPds(game, pack),
  };
}
/** A manual correction: counts change by its delta, signed. */
export function applyAdjustment(state: GameState, entry: Extract<Entry, { type: 'adjustment' }>, warnings: Warning[]): void {
  const d = entry.delta;
  state.tradeGoods += d.tradeGoods ?? 0;
  state.commodities += d.commodities ?? 0;
  state.tactic += d.tactic ?? 0;
  state.fleet += d.fleet ?? 0;
  state.strategy += d.strategy ?? 0;
  state.vp += d.vp ?? 0;
  if (d.units) shiftUnits(state.systems, d.units.systemId, d.units.units, warnings);
  for (const [planetId, units] of Object.entries(d.ground ?? {})) shiftUnits(state.ground, planetId, units, warnings);
}
