/**
 * The Quantumcore (relic, Thunder's Edge): "When you gain this card, gain your breakthrough. You have SYNERGY for all
 * technology types."
 *
 * Decided: a mix. Gaining the relic (an entry's `gains`) also gives the player their faction's breakthrough, which the
 * holdings count; that needs a hook on gaining a component, which the contract does not have yet. SYNERGY (TE rules,
 * Synergy 2) lets a technology of one colour stand for another when researching; the replay checks no prerequisites
 * yet, so that half has nothing to change until it does.
 */
import { gainBreakthrough } from '../../breakthrough';
import type { ComponentEffect } from '../../types';

export const id = 'relic:quantumcore';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Through the one gain of a breakthrough: its own "when you gain this card" runs too (Stellar Genesis gives Avernus).
  gained: turn => { gainBreakthrough(turn); },
};
