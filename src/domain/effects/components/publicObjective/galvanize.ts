/**
 * Galvanize the People (public objective, stage I): "Spend a total of 6 tokens from your tactic and/or strategy pools."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: the tokens the status entry spends are taken from the pools (poolNegative when a pool lacks them);
 * only tactic and strategy tokens count toward the 6, fewer is objectiveUnmet.
 */
import { objectiveNotMet } from '../../points/status';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:galvanize';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const { events } = ctx.spendOnObjectives();
    const spend = ctx.entry?.type === 'statusTokens' ? ctx.entry.spend ?? {} : {};
    const have = Math.max(0, spend.tactic ?? 0) + Math.max(0, spend.strategy ?? 0);
    if (have < 6) ctx.warn(objectiveNotMet(id, have, 6));
    return events;
  },
};
