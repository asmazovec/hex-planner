/**
 * Cruiser II (unit upgrade, base game): "Cost 2, Combat 6, Move 3, Capacity 1"
 *
 * A `modify` generated from the unit table (`unitUpgrades.ts`, LRR 97.4): move 3 instead of 2 and capacity 1 instead
 * of none; the cost stays 2. Combat is not counted by the plan. This file adds nothing to the generated numbers.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:cr2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
