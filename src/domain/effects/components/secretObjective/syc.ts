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
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:syc';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ map, pack, holder, controller }) => ({
    have: systemSlots(map).some(slot => {
      const owners = planetsOf(map, slot, pack).map(planet => controller(planet));
      return owners.includes(holder) && owners.some(owner => owner !== undefined && owner !== holder);
    }) ? 1 : 0,
    need: 1,
  }),
  holder: 'self',
};
