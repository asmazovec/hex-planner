/**
 * Expedition, a hazardous exploration card: "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2): the planet explored is readied, though a planet gained enters exhausted (LRR 49.5.2, 71). Its condition is a fact of the board
 * the plan knows: with a mech of the player on the planet nothing is removed; without one, one infantry is removed from
 * the planet. With neither the card does nothing and is warned of with a new code (explorationCondition, LRR 35.2 and
 * the card's text, step invasion). Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution in the entry that gains the planet comes in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:exp1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
