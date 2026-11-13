/**
 * Lead From the Front (public objective, stage I): "Spend a total of 3 tokens from your tactic and/or strategy
 * pools."
 *
 * Decided: play (like Galvanize the People): the tokens the status entry spends are taken from the pools (poolNegative
 * when a pool lacks them); only tactic and strategy tokens count toward the 3 (61.10), fewer is objectiveUnmet.
 */
import { objectiveNotMet, spentOnObjectives } from '../../points/status';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:lead';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Tokens of the fleet pool do not count (61.10).
  play: turn => {
    spentOnObjectives(turn);
    const spend = turn.entry.type === 'statusTokens' ? turn.entry.spend ?? {} : {};
    const have = Math.max(0, spend.tactic ?? 0) + Math.max(0, spend.strategy ?? 0);
    if (have < 3) turn.warnings.push(objectiveNotMet(id, have, 3));
  },
};
