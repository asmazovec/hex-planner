/**
 * Slipstream (Ghosts of Creuss, ability): "During your tactical actions: Apply +1 to the move value of each of your
 * ships that starts its movement in your home system or in a system that contains either an alpha or beta wormhole."
 *
 * Decided: `passive` `modify` of the point `speed`, which is asked with the system the ship starts in: +1 from the home
 * system or from a system with an alpha or beta wormhole (a Creuss token included); not a delta or gamma one (Creuss
 * notes, Slipstream 1). A modify, not a waiver: the route is checked against the raised value. A unit that does not
 * move by itself (value 0) stays as it is.
 */
import { startsAtHome, startWormholes } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'ability:slipstream';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: {
    speed: (value, ctx) => (value > 0 && (startsAtHome(ctx) || startWormholes(ctx).some(type => type === 'alpha' || type === 'beta')) ? value + 1 : value),
  },
};
