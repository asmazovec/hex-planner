/**
 * Neuroglaive (Naalu Collective, technology): "After another player activates a system that contains 1 or more of your
 * ships, that player removes 1 token from their fleet pool and returns it to their reinforcements."
 *
 * Decided: passive, answered at the activation of any player (`onActivate`): when the activator is not the owner and the
 * owner has a ship (not ground forces, not a structure) in the system, the activator's fleet pool loses one token. My own
 * activations are untouched.
 */
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';
import '../../points/movement';

export const id = 'technology:ng';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onActivate: ({ owner, activator, state, activeState, systemId, pack }) => {
    if (owner === activator) return;
    const ships = Object.entries(state.systems[systemId] ?? {}).some(([unit, count]) => (count ?? 0) > 0 && pack.units[unit as UnitId]?.ground === false);
    if (ships) activeState.fleet -= 1;
  },
};
