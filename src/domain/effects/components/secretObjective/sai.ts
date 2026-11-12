/**
 * Seize an Icon (secret objective, Prophecy of Kings): "Control a legendary planet."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: a planet with
 * a legendary ability (`PlanetDef.legendary`) the player controls. Scoring it while the board does not meet it breaks
 * LRR 61.5 and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Pass 2: the
 * requirement is written.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:sai';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ state, pack }) => ({
    have: Object.keys(state.control).filter(planetId => state.control[planetId] === 'me' && pack.planets[planetId]?.legendary).length,
    need: 1,
  }),
};
