/**
 * Become a Legend (public, stage II objective, Prophecy of Kings): "Have units in 4 systems that contain legendary planets, Mecatol Rex, or anomalies."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts systems where the player has units at the Score Objectives step; it does not let a ship enter an anomaly or ignore any rule of movement, so the movement checks stay as they are. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:become_legend';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
