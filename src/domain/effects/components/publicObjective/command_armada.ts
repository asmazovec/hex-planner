/**
 * Command an Armada (public, stage II objective, Prophecy of Kings): "Have 8 or more non-fighter ships in 1 system."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it asks for 8 non-fighter ships in a system but does not raise the fleet pool: the fleet pool check (37.1) still holds for those ships, and nothing else of the count changes. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:command_armada';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
