/**
 * Shared by the four research facilities (warfare, biotic, cybernetic, propulsion): "This planet has a <colour>
 * technology specialty. If this planet already has a technology specialty, this planet's resource and influence values
 * are each increased by 1 instead." Not a component file: it sits one folder deeper, where the registry does not look.
 */
import { specialtiesOf } from '../../../../specialties';
import type { ComponentEffect, ModifierContext } from '../../../types';
import type { Hooked } from '../../../../../game/abilities/types';
import { attachExplored } from './attach';

/**
 * Whether the planet already has a specialty without this card: the printed one, or another card attached to it. The
 * specialty this card gives is the planet's own on a planet without one (`techSlicePlanets` reads it).
 */
function alreadySpecialized(ctx: ModifierContext['planetResources'], id: string): boolean {
  return ctx.pack !== undefined && specialtiesOf(ctx.pack, ctx.planetId, (ctx.attached ?? []).filter(card => card !== id)).length > 0;
}

/** A research facility: attached where explored; +1 resource and +1 influence instead of its specialty on a planet that has one. */
/** What a facility does when explored: it joins the planet's attachments. */
export const facilityAbility: Hooked = { holder: 'anyone', on: { gained: attachExplored } };

export const facilityEffect = (id: string): ComponentEffect => ({
  tier: 'passive', rule: id,
  modify: {
    planetResources: (value, ctx) => (alreadySpecialized(ctx, id) ? value + 1 : value),
    planetInfluence: (value, ctx) => (alreadySpecialized(ctx, id) ? value + 1 : value),
  },
});
