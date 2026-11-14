/**
 * Mercenary Outfit (cultural exploration, Prophecy of Kings): "You may place 1 infantry from your reinforcements on this
 * planet."
 *
 * Decided: `play`, named in the `uses` of the tactical action whose landing takes control of the planet explored (35.1):
 * one infantry is placed on that planet. With no planet newly controlled by the entry there is no "this planet" and
 * nothing is placed. Pass 2: written.
 */
import type { Ability } from '../../../../game/abilities/types';
import { place } from '../../../../game/abilities/emit';

export const id = 'exploration:mo1';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'anyone',
  on: {
    // Asked only for a planet newly gained; a planet taken from another player is not explored (35.1).
    onGainControl: (ctx, got) => (got.explores ? [place.units(ctx.holder, { planet: got.planetId }, { infantry: 1 })] : undefined),
  },
};
