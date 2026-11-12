/**
 * Core Mine, a hazardous exploration card: "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, gain 1 trade good."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2): one trade good (LRR 93). Its condition is a fact of the board
 * the plan knows: with a mech of the player on the planet nothing is removed; without one, one infantry is removed from
 * the planet. With neither the card does nothing and is warned of with a new code (explorationCondition, LRR 35.2 and
 * the card's text, step invasion). Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution in the entry that gains the planet comes in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:cm1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
