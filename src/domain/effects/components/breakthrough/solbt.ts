/**
 * Bellum Gloriosum (Federation of Sol, breakthrough): "When you produce a ship that has capacity, you may also
 * produce any combination of ground forces or fighters up to that ship's capacity; they do not count against your
 * PRODUCTION limit."
 *
 * Pass 1: a hint. Decided: `passive` waiver of `productionOver`, narrowed with `when`: the fighters and ground forces of the
 * production up to the combined capacity of the ships produced with them are not counted (Sol notes, Bellum Gloriosum 1);
 * the rest must fit the PRODUCTION limit.
 */
import type { UnitCounts, UnitId } from '../../../types';
import type { Ability } from '../../../../game/abilities/types';
import type { PermitContext } from '../../../../game/abilities/types';

export const id = 'breakthrough:solbt';

/** The units the turn produces: a tactical action's production, or that of a component entry. */
function producedBy(ctx: PermitContext): UnitCounts {
  const entry = ctx.entry;
  if (entry?.type === 'tactical') return entry.production;
  if (entry?.type === 'component') return entry.effects?.production?.units ?? {};
  return {};
}

/** The fighters and ground forces freed by the combined capacity of the ships produced with them. */
function freed(ctx: PermitContext): number {
  const units = producedBy(ctx);
  const carried = Object.entries(units).reduce((sum, [unit, n]) => {
    const def = ctx.pack.units[unit as UnitId];
    return def && (def.ground || def.fighter) ? sum + (n ?? 0) : sum;
  }, 0);
  return Math.min(carried, ctx.prior.capacityOf(units).capacity);
}

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'productionOver',
    rule: 'they do not count against your PRODUCTION limit',
    when: (warning, ctx) => Number(warning.params.count) - freed(ctx) <= Number(warning.params.value),
  }],
};
