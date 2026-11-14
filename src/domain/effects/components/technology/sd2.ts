/**
 * Space Dock II (unit upgrade, base game): "PRODUCTION X / This unit's PRODUCTION value is equal to 4 more than the
 * resource value of this planet. / Up to 3 fighters in this system do not count against your ships' capacity."
 *
 * A `modify` of `productionValue` generated from the structure table (`unitUpgrades.ts`, LRR 97.4, 79.1): the
 * planet's resources plus 4 instead of plus 2. The three fighters are kept by Space Dock I as well
 * (`dockFighterRoom`), so nothing more changes.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:sd2';

export const ability: Ability = { tier: 'passive', rule: '97.4',
  holder: 'self',
};
