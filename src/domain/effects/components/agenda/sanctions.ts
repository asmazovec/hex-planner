/**
 * Executive Sanctions (agenda, law): "For: Each player can have a maximum of 3 action cards in their hand. Against:
 * Each player discards 1 random action card from their hand."
 *
 * Decided: modify. LRR 2.4 limits a hand to seven action cards, and 2.4.1 lets a game effect change that number; the
 * law makes it 3 (`handLimit`). The replay does not check the hand yet: a new check (`handOverLimit`, 2.4) comes
 * first, then the law changes its number. "Against" discards a random card, entered by the player. Pass 1: the hint it
 * is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:sanctions';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { handLimit: value => Math.min(value, 3) },
};
