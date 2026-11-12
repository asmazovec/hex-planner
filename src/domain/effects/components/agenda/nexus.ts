/**
 * Nexus Sovereignty (law): "For: Alpha and beta wormholes in the wormhole nexus have no effect during movement.
 * Against: Place a gamma wormhole token in the Mecatol Rex system."
 *
 * Decided: hint for now. "For" removes the joining of the wormhole nexus by its alpha and beta wormholes, "Against"
 * puts a gamma wormhole in the Mecatol Rex system: both change adjacency, which the plan uses for the reach shown on
 * the map only. An unjoined step of a route is a jump the route check does not warn of, so no warning changes; the
 * reach is a test.todo until the movement graph knows the laws.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:nexus';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
