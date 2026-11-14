/**
 * Found a Golden Age (public objective, stage II): "Spend 16 resources."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 16 resources from the status entry's `spend`: planets exhausted for resources, and the
 * trade goods spent, each worth what the payer's components make it; less is shortResources (step status).
 */
import { violation } from '../../../rules/registry';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:golden_age';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const { spent, events } = ctx.spendOnObjectives();
    const worth = ctx.tradeGoodWorth('resources');
    const paid = spent.resources + spent.tradeGoods * worth;
    if (paid < 16) ctx.warn(violation('shortResources', { needed: 16, paid }, 'status'));
    return events;
  },
};
