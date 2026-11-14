/**
 * Saturn Engine II (Titans of Ul, cruiser upgrade): "Cost 2, Combat 6, Move 3, Capacity 2, SUSTAIN DAMAGE"
 *
 * Decided: `modify`, and the generated numbers of the faction's level II already are it (`unitUpgrades.ts`): move 3
 * and capacity 2 for the Titans' cruisers. Nothing is added here.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:se2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
