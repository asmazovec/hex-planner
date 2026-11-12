/**
 * Unconventional Measures (agenda):
 * "For: Each player that voted "For" draws 2 action cards. Against: Each player that voted "For" discards all of
 * their action cards."
 *
 * Hint only: both outcomes depend on who voted "For", and the plan counts no votes; the action cards
 * drawn are unknown cards, entered by hand in the entry's `gains` and `spends`. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:unconventional';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
