/**
 * Manipulate Galactic Law (public objective, stage II): "Spend 16 influence."
 *
 * An objective lifts no check and changes no number of the count; it adds one (LRR 61.4, 61.5.1, 81.1, 61.10).
 * Decided: play: scoring it pays 16 influence from the status entry's `spend`: planets exhausted for influence, and the
 * trade goods spent, each worth what the payer's components make it; less is shortInfluence (step status).
 */
import { tradeGoodWorth } from '../../../payment';
import { violation } from '../../../rules/registry';
import { spentOnObjectives } from '../../points/status';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:manipulate_law';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const spent = spentOnObjectives(turn);
    const worth = tradeGoodWorth(turn.pack, turn.state, 'influence', { faction: turn.game.faction, shared: turn.shared });
    const paid = spent.influence + spent.tradeGoods * worth;
    if (paid < 16) turn.warnings.push(violation('shortInfluence', { needed: 16, paid }, 'status'));
  },
};
