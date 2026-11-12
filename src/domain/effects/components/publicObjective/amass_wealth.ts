/**
 * Amass Wealth (public objective, stage I): "Spend 3 influence, 3 resources, and 3 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 3 influence, 3 resources and 3 trade goods, each part apart; a planet gives one of its
 * values only. A part short is shortInfluence or shortResources; fewer than 3 trade goods named is objectiveUnmet.
 */
import { violation } from '../../../rules/registry';
import { objectiveNotMet, spentOnObjectives } from '../../points/status';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:amass_wealth';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const spent = spentOnObjectives(turn);
    if (spent.resources < 3) turn.warnings.push(violation('shortResources', { needed: 3, paid: spent.resources }, 'status'));
    if (spent.influence < 3) turn.warnings.push(violation('shortInfluence', { needed: 3, paid: spent.influence }, 'status'));
    if (spent.tradeGoods < 3) turn.warnings.push(objectiveNotMet(id, spent.tradeGoods, 3));
  },
};
