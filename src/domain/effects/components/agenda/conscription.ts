/**
 * Regulated Conscription (agenda): "For: When a player produces units, they produce only 1 fighter and infantry for
 * its cost instead of 2. Against: No effect."
 *
 * A modify of `unitCost`: a fighter or an infantry is produced one for its cost instead of two, so each costs the
 * full printed cost (68.1.2 no longer halves it). Nothing is waived; the payment check runs against the new number.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:conscription';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { unitCost: (value, ctx) => (ctx.unit === 'fighter' || ctx.unit === 'infantry' ? Math.max(value, 1) : value) },
};
