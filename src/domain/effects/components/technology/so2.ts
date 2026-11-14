/**
 * Spec Ops II (Federation of Sol, infantry upgrade): "Cost 1(x2), Combat 6 After this unit is destroyed, roll 1 die.
 * If the result is 5 or greater, place the unit on this card. At the start of your next turn, place each unit that is
 * on this card on a planet you control in your home system."
 *
 * A unit upgrade: the rule stays 97.4 as generated; its numbers are generated (`unitUpgrades.ts`); this file adds nothing. The return of a destroyed infantry
 * on a 5 or more is a die roll the plan does not make; nothing more is counted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:so2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
