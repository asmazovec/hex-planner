/**
 * Quantum Entanglement (Ghosts of Creuss, ability): "You treat all systems that contain either an alpha or beta
 * wormhole as adjacent to each other. Game effects cannot prevent you from using this ability."
 *
 * Pass 1: a hint. Decided: a change of the route graph for the Creuss player (alpha and beta systems adjacent): the reach
 * the plan lights. No warning changes: a step between systems that are not joined is a jump the plan already allows.
 */
import { wormholeSlots } from '../../../movement';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:quantum_entanglement';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // Every system with an alpha wormhole is joined to every system with a beta one, Creuss tokens included. It lights
  // the reach and the neighbours; a step between systems that are not joined is a jump and is never warned of.
  links: ({ game, pack, tokens }) => {
    const beta = wormholeSlots(game, pack, 'beta', tokens);
    return wormholeSlots(game, pack, 'alpha', tokens).flatMap(alpha => beta.filter(slot => slot !== alpha).map((slot): readonly [string, string] => [alpha, slot]));
  },
  holder: 'self',
};
