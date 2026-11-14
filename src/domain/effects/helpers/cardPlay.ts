/**
 * Helpers for the `play` of action cards that move tokens, ships and goods about the board (batch 21). They call the
 * domain, so a file uses them inside `play` and `choose` only, never at its top level.
 */
import { componentById } from '../../components';
import { upgradeTech } from '../../holdings';
import { adjacentTo } from '../../movement';
import { planetsOf, systemSlots } from '../../replay/board';
import { removeUnits, unitIds } from '../../replay/state';
import { checkSystem } from '../../replay/transport';
import playCondition from '../../rules/codes/playCondition';
import { violation } from '../../rules/registry';
import { holderIn } from '../../stacks';
import { unitStats } from '../../unitStats';
import type { GameState, UnitCounts, UnitId } from '../../types';
import type { AbilityContext } from '../../../game/abilities/types';
import componentUnresolved from '../../rules/codes/componentUnresolved';
import type { GameEvent } from '../../../game/events';
import type { EffectTurn } from '../types';

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

const isShip = (turn: EffectTurn, unit: UnitId): boolean => !(turn.pack.units[unit]?.ground ?? (unit === 'infantry' || unit === 'mech'));

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

/** The slot a planet lies in, on the map. */
export const slotOfPlanet = (turn: EffectTurn, planetId: string): string | undefined =>
  systemSlots(turn.game).find(slot => planetsOf(turn.game, slot, turn.pack).includes(planetId));

/** Whether a slot holds a home system. */
export const isHomeSlot = (turn: EffectTurn, slot: string): boolean => {
  const tile = (turn.game.map[slot] ?? turn.game.fracture.tiles?.[slot] ?? slot).split('@')[0];
  return turn.pack.tiles[tile]?.kind === 'home';
};

/** The slots adjacent to a slot for a move of the plan (a shared side, a wormhole, a hyperlane). */
export const adjacentSlots = (turn: EffectTurn, slot: string): string[] => adjacentTo(turn.game, slot, turn.pack);

/** Who controls a planet as the owner of the entry sees it: `me`, an opponent id, or nobody. */
export function controllerOf(turn: EffectTurn, planetId: string): string | undefined {
  const mine = turn.player === 'me';
  const control = (mine ? turn.state : turn.shared).control[planetId];
  if (mine) return control === 'me' ? 'me' : control === 'enemy' ? holderIn(turn.game, turn.state, planetId) : undefined;
  return control === 'enemy' ? holderIn(turn.game, turn.shared, planetId) : undefined;
}

/** The state of a planet's controller, when it is another player's. */
export function rivalStateOf(turn: EffectTurn, planetId: string): GameState | undefined {
  const holder = controllerOf(turn, planetId);
  return holder === undefined || holder === turn.player ? undefined : turn.states[holder];
}

/** Whether a unit of the state has a bombardment roll (the upgrade counted when its technology is held). */
export function hasBombardment(turn: EffectTurn, state: GameState, unit: UnitId): boolean {
  const faction = state.faction ?? turn.game.faction;
  const tech = upgradeTech(turn.pack, faction, unit as never);
  return unitStats(faction, unit, tech !== undefined && state.holdings.technologies.includes(tech), turn.pack)?.bombard !== undefined;
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

/** Removes what is there, up to the request. */
export const removeFrom = (state: GameState, slot: string, units: UnitCounts): UnitCounts => removeUnits(state.systems, slot, units);

/** Adds a planet to a state's exhausted ones. */
export function exhaust(state: GameState, planetId: string): void {
  if (!state.exhausted.includes(planetId)) state.exhausted.push(planetId);
}

// The same questions for a play written for the kernel: they read the board through the context.

/** The card's own condition is not met: the play is warned of (2.6), and what was entered is applied all the same. */
export function unmetBy(ctx: AbilityContext): void {
  ctx.warn(violation(playCondition.code, { id: ctx.id, name: componentById(ctx.pack, ctx.id)?.name ?? ctx.id }));
}

/** What the card asks cannot be done as chosen: the play is warned of with the reason and does nothing. */
export function unresolvedBy(ctx: AbilityContext, reason: string): void {
  ctx.warn(violation(componentUnresolved.code, { id: ctx.id, name: componentById(ctx.pack, ctx.id)?.name ?? ctx.id, reason }));
}

/** A number the player entered for a choice; 0 where there is none. */
export const numberChosen = (ctx: AbilityContext, key: string): number => Number(ctx.choices[key] ?? 0) || 0;

/** How many ships (fighters among them, ground forces not) a player has in the space area of a system. */
export function shipsOf(ctx: AbilityContext, player: string, slot: string): number {
  const here = ctx.of(player).unitsIn(slot);
  return unitIds(here).filter(unit => !(ctx.pack.units[unit]?.ground ?? (unit === 'infantry' || unit === 'mech'))).reduce((sum, unit) => sum + (here[unit] ?? 0), 0);
}

/** The other players. */
export const othersBy = (ctx: AbilityContext): string[] => ctx.table.players.map(p => p.id).filter(id => id !== ctx.holder);

/** Whether another player has ships in the space area of a system. */
export const othersHaveShips = (ctx: AbilityContext, slot: string): boolean => othersBy(ctx).some(player => shipsOf(ctx, player, slot) > 0);

/** Whether a unit of the holder has capacity (the upgrade counted when its technology is held). */
export function carriesBy(ctx: AbilityContext, unit: UnitId): boolean {
  const faction = ctx.my.faction;
  const tech = upgradeTech(ctx.pack, faction, unit as never);
  return (unitStats(faction, unit, tech !== undefined && ctx.my.holds(tech), ctx.pack)?.capacity ?? 0) > 0;
}

/** Puts units of the holder in a system: the event is added to the play's, and the checks of the system after it (16.3, 37.1) are warned of. */
export function placeIn(ctx: AbilityContext, events: GameEvent[], slot: string, units: UnitCounts): void {
  events.push({ type: 'UnitsPlaced', player: ctx.holder, at: { slot }, units });
  ctx.after(events).systemWarnings(slot).forEach(ctx.warn);
}
