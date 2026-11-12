/**
 * Imperia (Mahact, ability):
 * While another player's command token is in your fleet pool, you can use the ability of that player's
 * commander, if it is unlocked.
 *
 * A passive waiver, red in pass 1: the commander of another player, unlocked by that player, can be used by the Mahact
 * player, so `componentNotHeld` of such a commander named in `uses` is lifted. Whose tokens are in the fleet pool is not
 * tracked, so that condition is not checked.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:imperia';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
