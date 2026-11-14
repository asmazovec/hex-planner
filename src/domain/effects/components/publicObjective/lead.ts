/**
 * Lead From the Front (public objective, stage I): "Spend a total of 3 tokens from your tactic and/or strategy
 * pools."
 *
 * Decided: play (like Galvanize the People): the tokens the status entry spends are taken from the pools (poolNegative
 * when a pool lacks them); only tactic and strategy tokens count toward the 3 (61.10), fewer is objectiveUnmet.
 */
import { objectiveNotMet } from '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:lead';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const { events } = ctx.spendOnObjectives();
    const spend = ctx.entry?.type === 'statusTokens' ? ctx.entry.spend ?? {} : {};
    const have = Math.max(0, spend.tactic ?? 0) + Math.max(0, spend.strategy ?? 0);
    if (have < 3) ctx.warn(objectiveNotMet(id, have, 3));
    return events;
  },
};
