/**
 * Hesh and Prit, Perfect Synthesis (Naaz-Rokha Alliance, hero): "ACTION: Gain 1 relic and perform the secondary
 * ability of up to 2 readied or unchosen strategy cards. during this action, spend command tokens from your
 * reinforcements instead of your strategy pool. Then, purge this card."
 *
 * A hint at the component step. What the plan counts already holds: the hero is played by a component action and
 * purged by it (51.12), and the relic is entered in «Взято и сброшено». The two secondary abilities performed within
 * this one action, paid from the reinforcements, are not modelled: a secondary is an entry of its own, a turn apart.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:naazhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
