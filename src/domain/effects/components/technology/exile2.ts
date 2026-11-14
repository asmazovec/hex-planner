/**
 * Exile II (Crimson Rebellion, destroyer upgrade): "Cost 1, Combat 7, Move 2, ANTI-FIGHTER BARRAGE 6 (x3). At the end
 * of any players' combat in this unit's system or up to 2 systems away, you may place 1 active or inactive breach in
 * that system."
 *
 * Decided: nothing beyond the generated numbers (`unitUpgrades.ts`); the move stays 2, as on Exile I. The breach placed
 * at the end of a combat is a reminder: the plan simulates no combat and has no breaches on its board. The file only
 * declares itself, so the generated level stays as it is.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:exile2';

/** The rule of every unit upgrade (97.4), as the generated effect has it. */
export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
