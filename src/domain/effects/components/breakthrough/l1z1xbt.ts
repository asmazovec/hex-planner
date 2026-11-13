/**
 * Fealty Uplink (L1Z1X Mindnet, breakthrough): "When you gain control of a planet, place infantry from your
 * reinforcements equal to that planet's influence value on that planet."
 *
 * Decided: a passive change of the board. When the L1Z1X gain control of a planet, infantry equal to its influence
 * is placed on it from reinforcements (mandatory, faction note 2). Pass 2 needs the same point in `gainControl` as
 * Assimilate.
 *
 * Pass 2: `onGainControl`: infantry equal to the printed influence of the planet are placed on it (`placeOnPlanet`).
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { place } from '../../../../game/abilities/emit';

export const id = 'breakthrough:l1z1xbt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    onGainControl: (ctx, got) => {
      const influence = ctx.pack.planets[got.planetId]?.influence ?? 0;
      return influence > 0 ? [place.units(ctx.holder, { planet: got.planetId }, { infantry: influence })] : undefined;
    },
  },
};
