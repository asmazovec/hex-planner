import { adjacentTo } from './movement';
import { planetsOf, systemSlots } from './replay/board';
import type { DataPack, Game, GameState, UnitCounts, UnitId } from './types';

/**
 * The planets whose ground forces a component lets the active player commit to land (49.2 names the space area
 * alone; G'hom Sek'kus: each planet in the active system and each planet in an adjacent system without a command
 * token of mine): those that hold ground forces of mine, with what stands there. A planet is no source for itself.
 * The check is the component's own (`landingFromPlanet`); this is only what the landing block offers.
 */
export function commitSources(game: Game, pack: DataPack, state: GameState, target: string): { planetId: string; units: UnitCounts }[] {
  const slots = new Set([target, ...adjacentTo(game, target, pack).filter(slot => !state.tokensOnMap.includes(slot))]);
  return systemSlots(game).filter(slot => slots.has(slot)).flatMap(slot => planetsOf(game, slot, pack))
    .map(planetId => ({ planetId, units: groundOn(state, planetId, pack) }))
    .filter(source => Object.keys(source.units).length > 0);
}

const groundOn = (state: GameState, planetId: string, pack: DataPack): UnitCounts => {
  const units: UnitCounts = {};
  for (const [unit, count] of Object.entries(state.ground[planetId] ?? {}) as [UnitId, number][]) if (count > 0 && pack.units[unit]?.ground) units[unit] = count;
  return units;
};
