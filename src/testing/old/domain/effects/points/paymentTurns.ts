import type { DataPack, Goods, Warning } from '../../../../../domain/types';
import type { Entry, Game } from '../../types';
import type { GameState } from '../../types';

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


declare module '../../../../../domain/effects/types' {
  interface Ability {
    /**
     * Any tier. Asked of every component in force for a side of a transaction, after it has been settled and for every
     * transaction of the turn: the place for a gain of either side (Dark Pact), for a note that acts on receipt (Black
     * Ops: `got.components` names it) and for a restriction on what a player may receive (Hubris: push a warning).
     */
    dealt?: (turn: DealTurn) => void;
  }
}
