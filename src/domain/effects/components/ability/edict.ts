/**
 * Edict (Mahact, ability):
 * Other player's tokens in your fleet pool increase your fleet limit but cannot be redistributed. When you win a
 * combat: Place 1 command token from your opponent's reinforcements in your fleet pool if it does not already
 * contain 1 of that player's tokens.
 *
 * A hint: other players' tokens on the Mahact command sheet are not tracked; a token gained after a combat is added to
 * the fleet pool by hand and then raises the fleet limit as any token does.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:edict';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
