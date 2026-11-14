/**
 * Letani Behemoth (Arborec, mech): "DEPLOY: When you would use your Mitosis faction ability you may replace 1 of your
 * infantry with 1 mech from your reinforcements instead."
 *
 * A `play` named in the `uses` of the status entry: instead of the infantry Mitosis places, one infantry of mine on a
 * planet becomes a mech. Only the Arborec have Mitosis to hang the deploy on, so another faction's play does nothing.
 * Its PRODUCTION and SUSTAIN DAMAGE are those of a unit, not of this card.
 */
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';

export const id = 'mech:arborec_mech';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    if (ctx.my.faction !== 'arborec') return [];
    const planet = ctx.my.planets().find(p => (p.ground.infantry ?? 0) > 0);
    if (planet === undefined) {
      ctx.warn(violation(componentCondition.code, { id, name: 'Letani Behemoth', condition: 'none of my infantry stands on a planet I control' }));
      return [];
    }
    return [removeUnits(ctx.holder, { planet: planet.id }, { infantry: 1 }), placeUnits(ctx.holder, { planet: planet.id }, { mech: 1 })];
  },
};
