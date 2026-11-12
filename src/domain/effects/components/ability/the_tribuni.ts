/**
 * "During setup, choose an unplayed faction from among the Mentak, the Xxcha and The Argent Flight; take that
 * faction's home system, command tokens and control markers. Additionally, take the Keleres Hero that corresponds
 * to that faction"
 *
 * Hint. A choice of setup: the home system and the hero are chosen when the game is created, not by an entry of
 * the plan, so there is no step to show it at.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:the_tribuni';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
