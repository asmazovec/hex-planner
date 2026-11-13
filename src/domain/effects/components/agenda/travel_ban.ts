/**
 * Enforced Travel Ban (agenda, law): "For: Alpha and beta wormholes have no effect during movement. Against: Destroy
 * each PDS in or adjacent to a system that contains a wormhole."
 *
 * A hint for now. The law takes away the adjacency of alpha and beta wormholes (Enforced Travel Ban note 2), but the
 * replay counts a step between systems that are not joined as a jump of one step and warns of nothing, so a route
 * through a wormhole costs the same with the law as without. Only the highlight of where ships can reach
 * (`routeReach`) would change, and it knows no laws. "Against" is a one-off destruction of PDS, not modelled.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:travel_ban';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['movement'] };
