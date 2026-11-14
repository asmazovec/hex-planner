/**
 * Linkship II (Ral Nel Consortium, destroyer upgrade): "Cost 1, Combat 8, Move 4, ANTI-FIGHTER BARRAGE 6 (x3). This
 * unit can use the SPACE CANNON ability of one of your structures in its space area; each linkship can trigger the
 * same structure."
 *
 * Decided: nothing beyond the generated numbers (`unitUpgrades.ts`), which already give the move of 4 the plan counts.
 * Combat, Anti-Fighter Barrage and Space Cannon are rolls the plan does not simulate. The file only declares itself, so
 * the generated level stays as it is.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:linkship2';

/** The rule of every unit upgrade (97.4), as the generated effect has it. */
export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
