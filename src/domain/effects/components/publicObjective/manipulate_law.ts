/**
 * Manipulate Galactic Law (public objective, stage II): "Spend 16 influence."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 16 influence from the status entry's `spend`: planets exhausted for influence, and the
 * trade goods spent, each worth what the payer's components make it; less is shortInfluence (step status).
 */
import { violation } from '../../../rules/registry';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:manipulate_law';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const { spent, events } = ctx.spendOnObjectives();
    const worth = ctx.tradeGoodWorth('influence');
    const paid = spent.influence + spent.tradeGoods * worth;
    if (paid < 16) ctx.warn(violation('shortInfluence', { needed: 16, paid }, 'status'));
    return events;
  },
};
