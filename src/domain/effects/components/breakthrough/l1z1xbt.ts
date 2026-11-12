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
import { placeOnPlanet } from '../../../replay/invasion';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:l1z1xbt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onGainControl: ({ pack, state, warnings, planetId }) => {
    const influence = pack.planets[planetId]?.influence ?? 0;
    if (influence > 0) placeOnPlanet(state, planetId, { infantry: influence }, warnings);
  },
};
