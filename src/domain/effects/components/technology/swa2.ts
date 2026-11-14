/**
 * Strike Wing Alpha II (Argent Flight, destroyer upgrade): "Cost 1, Combat 7, Move 2, Capacity 1. ANTI-FIGHTER BARRAGE
 * 6(x3). When this unit uses ANTI-FIGHTER BARRAGE, each result of 9 or 10 also destroys 1 of your opponents infantry in
 * the space area of the active system."
 *
 * A unit upgrade: its numbers (cost, move, capacity) are generated from the faction's level II (`unitUpgrades.ts`), and
 * the capacity of 1 is what sets it apart from the common Destroyer II. The barrage and the infantry it destroys are
 * dice the plan does not roll; nothing is added to the generated level.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:swa2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
