/**
 * Magen Defense Grid ΩΩ (technology, Prophecy of Kings, Codex IV): "When any player activates a system that contains 1
 * or more of your structures, place 1 infantry from your reinforcements with each of those structures. At the start of
 * ground combat on a planet that contains 1 or more of your structures, produce 1 hit and assign it to 1 of your
 * opponent's ground forces."
 *
 * Decided: the first sentence changes the board the plan counts: on activation of a system with my structures, one
 * infantry stands with each space dock and each PDS of mine there. It is passive (no choice, no exhaust) but places
 * units, which no point of the count does yet: pass 2 needs a hook in the activation step. The second sentence is a
 * hit in a combat the plan does not fight.
 * Pass 2: passive, with the activation hook (`onActivate`).
 */
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';
import '../../points/movement';

export const id = 'technology:md';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // Any player's activation reaches the owner's card; the infantry stand with the owner's own structures there.
  onActivate: ({ game, pack, systemId, state }) => {
    for (const planetId of planetsOf(game, systemId, pack)) {
      const structures = (state.docks.includes(planetId) ? 1 : 0) + (state.pds[planetId] ?? 0);
      if (structures > 0) {
        const here = state.ground[planetId] ?? {};
        state.ground[planetId] = { ...here, infantry: (here.infantry ?? 0) + structures };
      }
    }
  },
};
