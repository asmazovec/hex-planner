/**
 * Mercenary Outfit (cultural exploration, Prophecy of Kings): "You may place 1 infantry from your reinforcements on this
 * planet."
 *
 * Decided: `play`, named in the `uses` of the tactical action whose landing takes control of the planet explored (35.1):
 * one infantry is placed on that planet. With no planet newly controlled by the entry there is no "this planet" and
 * nothing is placed. Pass 2: written.
 */
import { placeOnPlanet } from '../../../replay/invasion';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:mo1';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Asked only for a planet newly gained; a planet taken from another player is not explored (35.1).
  onGainControl: turn => {
    if (turn.explores) placeOnPlanet(turn.state, turn.planetId, { infantry: 1 }, turn.warnings);
  },
};
