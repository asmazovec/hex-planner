/** The rule of each strategy card, by initiative; the variants of the card sets are told apart inside each. */
import { CARD } from '../../../domain/replay/cards/ids';
import { construction } from './construction';
import { diplomacy } from './diplomacy';
import { imperial } from './imperial';
import { leadership } from './leadership';
import { politics } from './politics';
import type { CardRule } from './rule';
import { technology } from './technology';
import { trade } from './trade';
import { warfare } from './warfare';

export type { CardPlay, CardRule } from './rule';

const RULES: Record<number, CardRule> = {
  [CARD.leadership]: leadership,
  [CARD.diplomacy]: diplomacy,
  [CARD.politics]: politics,
  [CARD.construction]: construction,
  [CARD.trade]: trade,
  [CARD.warfare]: warfare,
  [CARD.technology]: technology,
  [CARD.imperial]: imperial,
};

/** The rule of a card; no card chosen yet does nothing of its own. */
export const ruleOf = (card: number | undefined): CardRule => (card === undefined ? {} : RULES[card] ?? {});
