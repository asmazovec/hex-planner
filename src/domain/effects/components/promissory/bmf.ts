/**
 * Black Market Forgery (Naaz-Rokha Alliance, promissory note): "ACTION: Purge 2 of your relic fragments of the same
 * type to gain 1 relic. Then, return this card to the Naaz-Rokha player."
 *
 * A hint at the component step. Relic fragments are exploration cards, which the plan does not hold (`gain` in
 * src/domain/replay/holdings.ts), so the purge of two of the same type cannot be counted; the relic gained is entered
 * in «Взято и сброшено». What the plan does count already holds without a file: the note is played by a component
 * action, its own owner is warned (69.2), and another player's play returns it to the Naaz-Rokha player (69.3).
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:bmf';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
