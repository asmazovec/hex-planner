/**
 * 4X41C "Helios" V2 (Last Bastion, space dock upgrade): "This unit's PRODUCTION value is equal to 4 more than the
 * resource value of this planet. The resource value of this planet is increased by 2. Up to 3 fighters in this system
 * do not count against your ships' capacity."
 *
 * Decided: a `modify`. The generated upgrade (unitUpgrades.ts) already gives the planet's resources plus 4; the planet
 * of the dock has 2 more resources, and the Production value is taken from the raised value (Last Bastion, 4X31C
 * "Helios" 1), so the dock produces resources + 2 + 4, and the planet is worth 2 more resources when spent. The three
 * fighters are what every space dock keeps (`dockFighterRoom`), already counted.
 *
 * Pass 1: the generated numbers only (a unit upgrade's file is always passive); pass 2 adds `productionValue` +2 and
 * `planetResources` +2 on a planet holding the player's dock.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:helios2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
