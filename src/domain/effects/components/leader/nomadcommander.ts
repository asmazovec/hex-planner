/**
 * Navarch Feng (Nomad, commander): "When you produce: You can produce your flagship without spending resources."
 *
 * A `passive` `modify` of `unitCost` (pass 2): the flagship costs nothing to the payment while the commander is
 * unlocked. A modify, not a waiver of `shortResources`: the rest of the production is still paid in full and the
 * shortage is counted against it. The printed cost stays 8 for what the plan does not count (Scuttle, Integrated
 * Economy: Nomad, Navarch Feng note 2), and the flagship still counts towards the Production limit (note 1), which
 * `productionOver` checks by units, not by cost.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nomadcommander';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { unitCost: (value, ctx) => (ctx.unit === 'flagship' ? 0 : value) },
};
