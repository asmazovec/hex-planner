/**
 * Produce en Masse (secret objective, Prophecy of Kings): "Have units with a combined PRODUCTION value of at least 8 in
 * a single system."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: the
 * Production values of the player's units in one system (a space dock: its planet's resources plus its printed value,
 * as `checkProduction` counts it). Scoring it while the board does not meet it breaks LRR 61.5 and is warned of with
 * the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Pass 2: the requirement is written.
 */
import { systemSlots } from '../../../replay/board';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:pem';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ map, productionIn }) => ({
    have: Math.max(0, ...systemSlots(map).map(slot => productionIn(slot))),
    need: 8,
  }),
  holder: 'self',
};
