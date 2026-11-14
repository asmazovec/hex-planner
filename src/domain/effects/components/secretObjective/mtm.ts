/**
 * Mechanize the Military (secret objective, Prophecy of Kings): "Have 1 mech on each of 4 planets."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: four planets
 * with a mech of the player on each (`ground`). Scoring it while the board does not meet it breaks LRR 61.5 and is
 * warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until then the card is
 * the hint it was.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:mtm';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ holder, grounds, controller }) => ({
    have: grounds().filter(({ planet, units }) => controller(planet) === holder && (units.mech ?? 0) > 0).length,
    need: 4,
  }),
  holder: 'self',
};
