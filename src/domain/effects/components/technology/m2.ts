/**
 * Memoria II (Nomad, flagship upgrade): "Cost 8, Combat 5(x2), Move 2, Capacity 6 SUSTAIN DAMAGE, ANTI-FIGHTER BARRAGE
 * 5(x3) You may treat this unit as if it were adjacent to systems that contain one or more of your mechs."
 *
 * Passive: the numbers are the generated level II of the flagship (`unitUpgrades.ts`), move 2 and capacity 6. The
 * adjacency needs nothing more: a route that marks two systems with no side, wormhole or hyperlane between them is a
 * jump, which costs one step and is not warned of (src/domain/movement.ts), so the flagship flies to a system of its
 * mechs as the card allows. Only the Memoria is adjacent this way (Nomad, Memoria note 1); the plan cannot tell who
 * else jumps there, as it warns of no jump at all.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:m2';

/** LRR 97.4, as every generated unit upgrade: the file adds nothing to the numbers, only this account of the adjacency. */
export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
