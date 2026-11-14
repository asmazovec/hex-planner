import type { EffectTurn } from '../types';
import { violation } from '../../../../../domain/rules/registry';
import playCondition from '../../../../../domain/rules/codes/playCondition';
import { componentById } from '../../../../../domain/components';
import type { UnitId, UnitCounts } from '../../../../../domain/types';
import type { GameState } from '../../types';
import { unitIds } from '../../../../../domain/replay/state';
import { adjacentTo } from '../../../../../domain/movement';
import { holderIn } from '../../stacks';
import { upgradeTech } from '../../../../../domain/holdings';
import { unitStats } from '../../../../../domain/unitStats';
import { checkSystem } from '../../replay/transport';

/** The card's own condition is not met: the play is warned of (2.6), and what was entered is applied all the same. */
export function unmet(turn: EffectTurn): void {
  turn.warnings.push(violation(playCondition.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
}
/** A number the player entered for a choice; 0 where there is none. */
export const numberOf = (turn: EffectTurn, key: string): number => Number(turn.choices[key] ?? 0) || 0;
/** The text the player entered for a choice, if any. */
export const textOf = (turn: EffectTurn, key: string): string | undefined => {
  const value = turn.choices[key];
  return value === undefined || value === '' ? undefined : String(value);
};
export const isShip = (turn: EffectTurn, unit: UnitId): boolean => !(turn.pack.units[unit]?.ground ?? (unit === 'infantry' || unit === 'mech'));
/** How many ships (fighters among them, ground forces not) of a state stand in the space area of a slot. */
export function shipsIn(turn: EffectTurn, state: GameState, slot: string): number {
  const here = state.systems[slot] ?? {};
  return unitIds(here).filter(unit => isShip(turn, unit)).reduce((sum, unit) => sum + (here[unit] ?? 0), 0);
}
/** The other players' states, by id. */
export const othersOf = (turn: EffectTurn): [string, GameState][] =>
  Object.entries(turn.states).filter(([who]) => who !== turn.player);
/** Whether another player has ships in the space area of a slot. */
export const othersShipsIn = (turn: EffectTurn, slot: string): boolean =>
  othersOf(turn).some(([, state]) => shipsIn(turn, state, slot) > 0);
/** The slots adjacent to a slot for a move of the plan (a shared side, a wormhole, a hyperlane). */
export const adjacentSlots = (turn: EffectTurn, slot: string): string[] => adjacentTo(turn.game, slot, turn.pack);
/** Who controls a planet as the owner of the entry sees it: `me`, an opponent id, or nobody. */
export function controllerOf(turn: EffectTurn, planetId: string): string | undefined {
  const mine = turn.player === 'me';
  const control = (mine ? turn.state : turn.shared).control[planetId];
  if (mine) return control === 'me' ? 'me' : control === 'enemy' ? holderIn(turn.game, turn.state, planetId) : undefined;
  return control === 'enemy' ? holderIn(turn.game, turn.shared, planetId) : undefined;
}
/** Whether a unit of the state has capacity (the upgrade counted when its technology is held). */
export function carries(turn: EffectTurn, state: GameState, unit: UnitId): boolean {
  const faction = state.faction ?? turn.game.faction;
  const tech = upgradeTech(turn.pack, faction, unit as never);
  return (unitStats(faction, unit, tech !== undefined && state.holdings.technologies.includes(tech), turn.pack)?.capacity ?? 0) > 0;
}
/** Units of the player of the entry added to a slot, and the capacity and fleet pool of the slot checked after them (16.3, 37.1). */
export function place(turn: EffectTurn, slot: string, units: UnitCounts): void {
  const bucket = (turn.state.systems[slot] ??= {});
  for (const unit of unitIds(units)) bucket[unit] = (bucket[unit] ?? 0) + (units[unit] ?? 0);
  turn.warnings.push(...checkSystem(turn.game, turn.state, slot, turn.pack));
}
