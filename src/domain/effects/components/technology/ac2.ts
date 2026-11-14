/**
 * Advanced Carrier II (Federation of Sol, carrier upgrade): "Cost 3, Combat 9, Move 2, Capacity 8 SUSTAIN DAMAGE"
 *
 * A unit upgrade: the rule stays 97.4 as generated; capacity 8 and move 2 come from the generated numbers (`unitUpgrades.ts`); this file adds nothing.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:ac2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
