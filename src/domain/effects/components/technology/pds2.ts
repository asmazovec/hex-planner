/**
 * PDS II (unit upgrade, base game): "PLANETARY SHIELD, SPACE CANNON 5 / You may use this unit's SPACE CANNON against
 * ships that are adjacent to this unit's system."
 *
 * Generated (`unitUpgrades.ts`, LRR 97.4) with no number of the count: a PDS has no Production, cost or move. SPACE
 * CANNON is a roll, which the plan does not make, at either range.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:pds2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
