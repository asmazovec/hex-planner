/**
 * Helpers for the `play` of action cards that move tokens, ships and goods about the board (batch 21). They call the
 * domain, so a file uses them inside `play` and `choose` only, never at its top level.
 */
import { componentById } from '../../components';
import { upgradeTech } from '../../holdings';
import { unitIds } from '../../replay/state';
import playCondition from '../../rules/codes/playCondition';
import { violation } from '../../rules/registry';
import { unitStats } from '../../unitStats';
import type { GameState, UnitCounts, UnitId } from '../../types';
import type { AbilityContext } from '../../../game/abilities/types';
import componentUnresolved from '../../rules/codes/componentUnresolved';
import type { GameEvent } from '../../../game/events';
import { planet as planetEvents, tokens } from '../../../game/abilities/emit';
import { MECATOL_PLANET, MECATOL_PLANET_TE, MECATOL_TILE_TE } from '../../mecatol';

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

/** Whether a unit of the holder has a bombardment roll (the upgrade counted when its technology is held). */
export function bombardsBy(ctx: AbilityContext, unit: UnitId): boolean {
  const faction = ctx.my.faction;
  const tech = upgradeTech(ctx.pack, faction, unit as never);
  return unitStats(faction, unit, tech !== undefined && ctx.my.holds(tech), ctx.pack)?.bombard !== undefined;
}

/** Puts units of the holder in a system: the event is added to the play's (none for no units), and the checks of the system after it (16.3, 37.1) are warned of. */
export function placeIn(ctx: AbilityContext, events: GameEvent[], slot: string, units: UnitCounts): void {
  if (unitIds(units).length > 0) events.push({ type: 'UnitsPlaced', player: ctx.holder, at: { slot }, units });
  ctx.after(events).systemWarnings(slot).forEach(ctx.warn);
}

/** The card of a legendary planet lies in the play area of whoever controls the planet (53.2, 53.3); used by anyone else, it is warned of. */
export function requireControlBy(ctx: AbilityContext, planet: string): void {
  if (ctx.board.planets[planet]?.owner !== ctx.holder) ctx.warn(violation('componentNotHeld', { id: ctx.id, name: componentById(ctx.pack, ctx.id)?.name ?? ctx.id }));
}

/** For the `play` of a component that costs strategy tokens: takes `count` from the pool and warns `shortStrategy` when it holds fewer (20.5). The components in force are told of the spent tokens by the runner. */
export function spendStrategyBy(ctx: AbilityContext, count = 1): GameEvent[] {
  const have = ctx.my.pools.strategy;
  if (have < count) ctx.warn(violation('shortStrategy', { have }));
  return [tokens(ctx.holder, { strategy: -count })];
}

/** The planet id of Mecatol Rex on this map: the Thunder's Edge one when its tile is in the centre. */
export const mecatolPlanetBy = (ctx: AbilityContext): string =>
  Object.values(ctx.table.map).some(tile => tile.split('@')[0] === MECATOL_TILE_TE) ? MECATOL_PLANET_TE : MECATOL_PLANET;

/** The units a move asks of a system that the holder has there: what is short is warned of (`unitsMissing`), and the source only ends empty, never below. */
export function missingBy(ctx: AbilityContext, slot: string, units: UnitCounts): UnitCounts {
  const have = ctx.my.unitsIn(slot);
  const found: UnitCounts = {};
  for (const unit of unitIds(units)) {
    const wanted = units[unit] ?? 0;
    const missing = wanted - (have[unit] ?? 0);
    if (missing > 0) ctx.warn(violation('unitsMissing', { where: slot, unit, missing }));
    const taken = Math.min(wanted, have[unit] ?? 0);
    if (taken > 0) found[unit] = taken;
  }
  return found;
}

/** The holder takes control of a planet and it comes exhausted. The resolver does the rest for every planet a play gains, as a landing does: the hooks of the gain run and the trade goods `tradeGoodsOnControl` asks come. A planet already theirs changes nothing. */
export function takeControlBy(ctx: AbilityContext, planetId: string): GameEvent[] {
  return ctx.board.planets[planetId]?.owner === ctx.holder ? [] : [planetEvents.gain(ctx.holder, planetId), planetEvents.exhaust(ctx.holder, planetId)];
}
