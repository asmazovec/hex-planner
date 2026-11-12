/**
 * Al'Raith Ix Ianovar (Vuil'raith Cabal, breakthrough): "This breakthrough causes The Fracture to enter play without a
 * roll, if it is not already in play. After this card enters play, move up to 2 ingress tokens into systems that
 * contain gravity rifts. Apply +1 to the MOVE value of each of your ships that start their movement in The Fracture."
 *
 * Decided: `modify` of `speed`: +1 for a ship whose movement starts in a system of The Fracture. The Fracture and its
 * ingress tokens are set on the map by hand.
 */
import { startsInFracture } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:cabalbt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { speed: (value, ctx) => (value > 0 && startsInFracture(ctx) ? value + 1 : value) },
};
