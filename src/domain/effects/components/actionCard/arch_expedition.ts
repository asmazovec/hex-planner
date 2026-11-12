/**
 * Archaeological Expedition (action card). "ACTION: Reveal the top 3 cards of an exploration deck that matches a planet
 * you control; gain any relic fragments that you reveal and discard the rest."
 *
 * Decided: a hint of the component action. What is revealed is chance; the fragments gained are entered in «Взято»
 * of the same component action (the holdings keep no exploration cards yet, `gain` in replay/holdings.ts). The
 * condition "a planet you control" of a matching trait is not checked: which deck was used is not part of the entry,
 * and the plan counts no relic fragments, so there is nothing to validate.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:arch_expedition';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
