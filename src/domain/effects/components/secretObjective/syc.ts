/**
 * Stake Your Claim (secret objective, Prophecy of Kings): "Control a planet in a system that contains a planet
 * controlled by another player."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: a planet the
 * player controls in a system where another player controls a planet (`control`, 'enemy'). Scoring it while the board
 * does not meet it breaks LRR 61.5 and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning
 * forbids nothing. Pass 2: the requirement is written.
 */
import { planetsOf, systemSlots } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:syc';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ game, state, pack }) => ({
    // A planet is another player's when it is controlled and not mine: by an opponent, or by me when the owner is a rival.
    have: systemSlots(game).some(slot => {
      const planets = planetsOf(game, slot, pack);
      const mine = planets.some(planetId => state.control[planetId] === 'me');
      const theirs = planets.some(planetId => state.control[planetId] === 'enemy');
      return mine && theirs;
    }) ? 1 : 0,
    need: 1,
  }),
};
