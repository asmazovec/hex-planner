/**
 * Exotrireme II (Sardakk N'orr, dreadnought unit upgrade): "Cost 4, Combat 5, Move 2, Capacity 1 / SUSTAIN DAMAGE,
 * BOMBARDMENT 4(x2) / This unit cannot be destroyed by "Direct Hit" action cards. / After a round of space combat, you
 * may destroy this unit to destroy up to 2 ships in this system."
 *
 * The numbers the plan counts (move 2, capacity 1, cost 4) are those of the generated unit upgrade (`unitUpgrades.ts`):
 * this file adds nothing to them, and as the file of a unit upgrade it is passive. The rest of the text is combat
 * (Direct Hit, destroying ships after a round of space combat), which the plan does not simulate; a unit upgrade
 * cannot also be a hint, so that part has no reminder.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:exo2';

/** The rule of the generated unit upgrades (97.4), kept: the file changes nothing of them. */
export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
