/**
 * Plots Within Plots (The Firmament, ability): "You can score secret objectives already scored by other players if you
 * fulfill their requirements; this does not count against your secret objective limit or the number you can score in a
 * round. When you score another player's secret objective: do not gain a victory point; instead, place a facedown plot
 * card into your play area with that player's control token on it."
 *
 * A hint in the status phase. The plan checks neither who else scored a secret objective, nor the secret objective
 * limit, nor how many objectives are scored in a round, so there is no check to lift; the points scored are entered by
 * hand in the status entry, and plot cards are not tracked.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:plotsplots';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
