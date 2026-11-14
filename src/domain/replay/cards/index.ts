/** The handler of each strategy card, by initiative; the variants of the card sets are told apart inside each. */
import { construction } from './construction';
import { diplomacy } from './diplomacy';
import type { CardHandler } from './handler';
import { CARD } from './ids';
import { imperial } from './imperial';
import { leadership } from './leadership';
import { politics } from './politics';
import { technology } from './technology';
import { trade } from './trade';
import { warfare } from './warfare';

export type { CardCost, CardHandler, CardRound } from './handler';
export { CARD } from './ids';

const HANDLERS: Record<number, CardHandler> = {
  [CARD.leadership]: leadership,
  [CARD.diplomacy]: diplomacy,
  [CARD.politics]: politics,
  [CARD.construction]: construction,
  [CARD.trade]: trade,
  [CARD.warfare]: warfare,
  [CARD.technology]: technology,
  [CARD.imperial]: imperial,
};

const NONE: CardHandler = {};

/** The handler of a card; no card chosen yet does nothing of its own. */
export const handlerOf = (card: number | undefined): CardHandler => (card === undefined ? NONE : HANDLERS[card] ?? NONE);
