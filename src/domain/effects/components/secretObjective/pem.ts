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
import { systemProduction } from '../../../replay/production';
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:pem';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ game, state, pack }) => ({
    have: Math.max(0, ...systemSlots(game).map(slot => systemProduction(game, state, slot, pack))),
    need: 8,
  }),
};
