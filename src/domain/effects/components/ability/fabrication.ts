/**
 * Fabrication (Naaz-Rokha Alliance): "ACTION: Either purge 2 of your relic fragments of the same type to gain 1 relic;
 * or purge 1 of your relic fragments to gain 1 command token."
 *
 * To be a `play` (pass 2): the ability is played by a component action, and its choice `gain: 'token'` with `pool`
 * (`tactic`, `fleet` or `strategy`) puts one command token in that pool. The relic of the other choice is entered in
 * «Взято и сброшено», as every relic gained. The fragments are exploration cards, which the plan does not hold, so
 * their purge is not counted (Naaz-Rokha, Fabrication note 2: the fragment may be purged even with no token in the
 * reinforcements). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:fabrication';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
