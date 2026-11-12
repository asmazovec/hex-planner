/**
 * Found a Golden Age (public objective, stage II): "Spend 16 resources."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 16 resources from the status entry's `spend`: planets exhausted for resources, and the
 * trade goods spent, each worth what the payer's components make it; less is shortResources (step status).
 */
import { tradeGoodWorth } from '../../../payment';
import { violation } from '../../../rules/registry';
import { spentOnObjectives } from '../../points/status';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:golden_age';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const spent = spentOnObjectives(turn);
    const worth = tradeGoodWorth(turn.pack, turn.state, 'resources', { faction: turn.game.faction, shared: turn.shared });
    const paid = spent.resources + spent.tradeGoods * worth;
    if (paid < 16) turn.warnings.push(violation('shortResources', { needed: 16, paid }, 'status'));
  },
};
