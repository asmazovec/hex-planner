/**
 * Archon's Gift (Xxcha, breakthrough): "You can spend influence as if it were resources. You can spend resources as if
 * it were influence."
 *
 * Decided: a `passive` waiver of `shortResources` and `shortInfluence`, narrowed to the shortfall that the paying
 * planets cover when each is spent for its other value: a planet is spent for one or the other, never both (ruling 1),
 * so it is worth the greater of its two values. Nothing else changes (ruling 3): a dock's Production value still counts
 * the resources only.
 */
import type { Warning } from '../../../types';
import type { Ability } from '../../../../game/abilities/types';
import type { PermitContext } from '../../../../game/abilities/types';

export const id = 'breakthrough:xxchabt';

/** The planets an entry pays with, whichever kind of entry it is. */
const paidWith = (entry: PermitContext['entry']): string[] =>
  (entry && 'payment' in entry ? entry.payment : entry && 'effects' in entry ? entry.effects?.payment : undefined)?.planets ?? [];

/** What spending each paying planet for its other value adds: a planet is spent for one value or the other, never both (ruling 1). */
const swapped = (warning: Warning, ctx: PermitContext, to: 'resources' | 'influence'): boolean => {
  const gain = paidWith(ctx.entry).reduce((sum, planetId) => {
    const resources = ctx.prior.planetValue(planetId, 'resources');
    const influence = ctx.prior.planetValue(planetId, 'influence');
    return sum + Math.max(0, to === 'resources' ? influence - resources : resources - influence);
  }, 0);
  return Number(warning.params.needed) - Number(warning.params.paid) <= gain;
};

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [
    { code: 'shortResources', rule: 'You can spend influence as if it were resources.', when: (warning, ctx) => swapped(warning, ctx, 'resources') },
    { code: 'shortInfluence', rule: 'You can spend resources as if it were influence.', when: (warning, ctx) => swapped(warning, ctx, 'influence') },
  ],
};
