/**
 * Gashlai Physiology (Embers of Muaat): "Your ships can move through supernovas".
 *
 * Decided: a `passive` waiver of `routeBlocked` (86.1: "A ship cannot move through or into a supernova"), narrowed
 * with `when` to a supernova the route passes through: the warning's `systemId` is a supernova and not the active
 * system of the entry. A supernova as the active system ("into") stays warned of: that is Magmus Reactor's. An
 * asteroid field or a nebula on the route stays warned of. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:gashlai_physiology';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
