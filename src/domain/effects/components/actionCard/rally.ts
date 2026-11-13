/**
 * Rally (action card). "After you activate a system that contains another player's ships: Place 2 command tokens from
 * your reinforcements in your fleet pool."
 *
 * Decided: a play effect, named in the `uses` (or `spends`) of the tactical action it is played in: the fleet pool
 * gains 2 tokens from the reinforcements. The tokens are placed right after the activation, so the fleet pool check
 * of the same action's movement (37.1) already counts them: the sixth ship of a fleet pool of 3 is still warned of,
 * against 5. No check is lifted; the number changes.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:rally';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'activation',
  play: ({ state, entry }) => {
    // An activation exists only in a tactical action: the card discarded as a cost elsewhere (Nanomachines) places nothing.
    if (entry.type !== 'tactical') return;
    state.fleet += 2;
  },
};
