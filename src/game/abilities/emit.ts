/**
 * The small builders of events a hook returns: what a component does, in the words of the game. They only build; the
 * runner applies them (`resolve/hooks.ts`) and `apply` is the only thing that changes a board.
 */
import type { Delta, GameEvent, Place } from '../events';
import type { ComponentId, PlayerId, RuleStep, UnitCounts } from '../types';

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
