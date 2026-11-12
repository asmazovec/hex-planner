/**
 * The points and hooks of payment, trade goods, commodities and transactions, added to the contract by declaration
 * merging so that no shared interface is edited. A component asks and answers them like any other point.
 */
import type { DataPack, Entry, Game, GameState, Goods, Warning } from '../../types';
import { stacked, type Applied } from '../apply';
import { effectOf, orderOf, passivesOf, type Holder } from '../registry';
import type { ComponentEffect } from '../types';

/** What a transaction (LRR 94) tells a component of one of its two sides, after the goods and components have moved. */
export interface DealTurn {
  /** The game as the owner of the entry sees it. */
  game: Game;
  pack: DataPack;
  /** The turn whose act this is. */
  entry: Entry;
  /** `give` when this side is the owner of the turn, `get` when it is the neighbour they dealt with. */
  side: 'give' | 'get';
  /** This side and the other one: `me` or an opponent's id. */
  self: string;
  partner: string;
  /** The faction of this side. */
  faction: string;
  /** This side after the deal, the other side after it, and my state (laws, attachments). */
  state: GameState;
  other: GameState;
  shared: GameState;
  /** What this side did hand over and what it did receive: only what actually moved; commodities arrive as trade goods. */
  gave: Goods;
  got: Goods;
  /** The commodity value of this side's faction with its components applied. */
  commodityValue: number;
  /** The warnings of the entry: a restriction of a component is added here. */
  warnings: Warning[];
}

declare module '../types' {
  interface ModifierContext {
    /** What one trade good spent on a payment is worth in `kind`; the base is 1. */
    tradeGoodValue: { kind: 'resources' | 'influence'; faction: string };
    /** The commodity value of a faction: what the commodities are replenished to; the base is the printed value. */
    commodityValue: { faction: string };
  }

  interface ComponentEffect {
    /**
     * Any tier. Asked of every component in force for a side of a transaction, after it has been settled and for every
     * transaction of the turn: the place for a gain of either side (Dark Pact), for a note that acts on receipt (Black
     * Ops: `got.components` names it) and for a restriction on what a player may receive (Hubris: push a warning).
     */
    dealt?: (turn: DealTurn) => void;
    /**
     * Any tier. What the component costs to play as a component action, paid with the `payment` of the entry
     * (resources or influence, from planets and trade goods): the replay pays it and warns when it is short.
     */
    cost?: { kind: 'resources' | 'influence'; amount: number };
  }
}

/**
 * A planet's resources or influence after the components of its controller and those attached to it. Attached cards
 * (`GameState.attachments`, kept on my state) are held by no player, so they are asked here, for this planet only,
 * and every modifier is given the planet's `attached` list; a law in force for the whole game must look there to
 * know it was elected for this planet.
 */
export function appliedToPlanet(
  pack: DataPack, who: Holder, attached: readonly string[], point: 'planetResources' | 'planetInfluence', base: number, planetId: string, dock = false,
): Applied {
  const own = passivesOf(pack, who);
  const have = new Set(own.map(([id]) => id));
  const extra = attached.filter(id => !have.has(id)).flatMap((id): [string, ComponentEffect][] => {
    const effect = effectOf(pack, id);
    return effect ? [[id, effect]] : [];
  });
  const all = [...own, ...extra].sort((a, b) => orderOf(pack, a[0]) - orderOf(pack, b[0]));
  return stacked(all, point, base, { planetId, attached, dock });
}
