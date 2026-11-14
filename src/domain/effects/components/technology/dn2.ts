/**
 * Dreadnought II (unit upgrade, base game): "Cost 4, Combat 5, Move 2, Capacity 1 / SUSTAIN DAMAGE, BOMBARDMENT 5 /
 * This unit cannot be destroyed by "Direct Hit" action cards."
 *
 * A `modify` generated from the unit table (`unitUpgrades.ts`, LRR 97.4): move 2 instead of 1; cost and capacity stay.
 * The protection from Direct Hit belongs to the combat, which the plan does not fight; a passive effect cannot carry a
 * reminder (`hintAt` is for hints), so it is not shown.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:dn2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
