/**
 * Impersonation (action card). "ACTION: Spend 3 influence to draw 1 secret objective."
 *
 * Decided: a play effect of its component action, which is paid: the entry pays 3 influence with planets and trade
 * goods (as a strategy card's cost is paid, `shortInfluence` when short; ruling 1: it cannot be played with less than
 * three influence available) and the planets used are exhausted. The objective drawn is chance; the player enters it
 * in «Взято» of the same action, which already puts it among the secrets in hand.
 *
 * Pass 1: the hint it is today; the tests say what it must do. The component action has no payment yet.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:impersonation';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  cost: { kind: 'influence', amount: 3 },
  holder: 'self',
  // The objective drawn is chance: the player enters it as a gain of the action.
  play: () => [],
};
