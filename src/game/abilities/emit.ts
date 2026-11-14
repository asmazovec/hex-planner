/**
 * The small builders of events a hook returns: what a component does, in the words of the game. They only build; the
 * runner applies them (`resolve/hooks.ts`) and `apply` is the only thing that changes a board.
 */
import type { Delta, GameEvent, Place } from '../events';
import type { ComponentId, PlayerId, RuleStep, StructureCounts, UnitCounts } from '../types';

/** Trade goods gained (or, negative, spent). */
export const tradeGoods = (player: PlayerId, delta: number): GameEvent => ({ type: 'TradeGoodsChanged', player, delta });
/** Victory points gained or lost. */
export const points = (player: PlayerId, delta: number): GameEvent => ({ type: 'PointsChanged', player, delta });
/** Tokens gained or lost in the pools; `step` is the block a pool warning of the change stands in. */
export const tokens = (player: PlayerId, delta: Delta, step?: RuleStep): GameEvent => ({ type: 'TokensChanged', player, delta, ...(step ? { cause: { step } } : {}) });
/** Units placed from the reinforcements. */
export const placeUnits = (player: PlayerId, at: Place, units: UnitCounts): GameEvent => ({ type: 'UnitsPlaced', player, at, units });

/** A card of the player's comes, leaves their hands, goes out of the game, or is exhausted. */
export const card = {
  gain: (player: PlayerId, id: ComponentId, count = 1): GameEvent => ({ type: 'CardGained', player, card: id, ...(count !== 1 ? { count } : {}) }),
  lose: (player: PlayerId, id: ComponentId, count = 1): GameEvent => ({ type: 'CardLost', player, card: id, ...(count !== 1 ? { count } : {}) }),
  purge: (player: PlayerId, id: ComponentId): GameEvent => ({ type: 'CardPurged', player, card: id }),
  exhaust: (player: PlayerId, id: ComponentId): GameEvent => ({ type: 'CardExhausted', player, card: id }),
};

export const gain = { tradeGoods, points, tokens };
export const place = { units: placeUnits };

/** Structures of a player taken off a planet (back to the reinforcements) or put on it. */
export const structures = {
  remove: (player: PlayerId, planet: string, units: StructureCounts): GameEvent => ({ type: 'StructureRemoved', player, at: { planet }, structures: units }),
  place: (player: PlayerId, planet: string, units: StructureCounts): GameEvent => ({ type: 'StructurePlaced', player, at: { planet }, structures: units }),
};

/** Units of a player taken off the board. */
export const removeUnits = (player: PlayerId, at: Place, units: UnitCounts, reason?: 'combat' | 'limit' | 'cost' | 'capture'): GameEvent => ({ type: 'UnitsRemoved', player, at, units, ...(reason ? { reason } : {}) });

/** A planet of the player's exhausted or readied. */
export const planet = {
  exhaust: (player: PlayerId, id: string): GameEvent => ({ type: 'PlanetExhausted', player, planet: id }),
  ready: (player: PlayerId, id: string): GameEvent => ({ type: 'PlanetReadied', player, planet: id }),
  gain: (player: PlayerId, id: string): GameEvent => ({ type: 'PlanetGained', player, planet: id }),
};

/** Commodities gained or lost. */
export const commodities = (player: PlayerId, delta: number): GameEvent => ({ type: 'CommoditiesChanged', player, delta });

/** A technology researched. */
export const researched = (player: PlayerId, technology: ComponentId): GameEvent => ({ type: 'TechnologyResearched', player, technology });

/** A command token of the player laid on a system of the map, or taken off it (neither moves a pool). */
export const commandToken = {
  place: (player: PlayerId, system: string): GameEvent => ({ type: 'SystemActivated', player, system }),
  remove: (player: PlayerId, system: string): GameEvent => ({ type: 'TokenReturned', player, system }),
};
