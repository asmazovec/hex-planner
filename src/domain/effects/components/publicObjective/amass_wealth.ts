/**
 * Amass Wealth (public objective, stage I): "Spend 3 influence, 3 resources, and 3 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 3 influence, 3 resources and 3 trade goods, each part apart; a planet gives one of its
 * values only. A part short is shortInfluence or shortResources; fewer than 3 trade goods named is objectiveUnmet.
 */
import { violation } from '../../../rules/registry';
import { objectiveNotMet } from '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:amass_wealth';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const { spent, events } = ctx.spendOnObjectives();
    if (spent.resources < 3) ctx.warn(violation('shortResources', { needed: 3, paid: spent.resources }, 'status'));
    if (spent.influence < 3) ctx.warn(violation('shortInfluence', { needed: 3, paid: spent.influence }, 'status'));
    if (spent.tradeGoods < 3) ctx.warn(objectiveNotMet(id, spent.tradeGoods, 3));
    return events;
  },
};
