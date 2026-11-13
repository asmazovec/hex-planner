/**
 * Gashlai Physiology (Embers of Muaat): "Your ships can move through supernovas".
 *
 * Decided: a `passive` waiver of `routeBlocked` (86.1: "A ship cannot move through or into a supernova"), narrowed
 * with `when` to a supernova the route passes through: the warning's `systemId` is a supernova and not the active
 * system of the entry. A supernova as the active system ("into") stays warned of: that is Magmus Reactor's. An
 * asteroid field or a nebula on the route stays warned of. Pass 1: still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:gashlai_physiology';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [
    {
      code: 'routeBlocked',
      rule: 'Your ships can move through supernovas',
      // "through" only: a supernova that is the active system is moved into, which stays warned of.
      when: (warning, ctx) => ctx.routeBlockKind(warning) === 'supernova' && ctx.entry?.type === 'tactical' && warning.params.systemId !== ctx.entry.systemId,
    },
  ],
};
