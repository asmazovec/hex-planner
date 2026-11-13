/**
 * Neuroglaive (Naalu Collective, technology): "After another player activates a system that contains 1 or more of your
 * ships, that player removes 1 token from their fleet pool and returns it to their reinforcements."
 *
 * Decided: passive, answered at the activation of any player (`onActivate`): when the activator is not the owner and the
 * owner has a ship (not ground forces, not a structure) in the system, the activator's fleet pool loses one token. My own
 * activations are untouched.
 */
import { gain } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { UnitId } from '../../../types';

export const id = 'technology:ng';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'others',
  on: {
    onActivate: (ctx, activation) => {
      const ships = Object.entries(ctx.my.unitsIn(activation.systemId)).some(([unit, count]) => (count ?? 0) > 0 && ctx.pack.units[unit as UnitId]?.ground === false);
      if (ships) return [gain.tokens(activation.activator, { fleet: -1 })];
    },
  },
};
