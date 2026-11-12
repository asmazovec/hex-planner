/**
 * Ul the Progenitor, Geoform (Titans of Ul, hero): "ACTION: Ready Elysium and attach this card to it. Its resource
 * and influence values are each increased by 3, and it gains the SPACE CANNON 5(x3) ability as if it were a unit."
 *
 * Decided: `play` by its component action: Elysium is readied and the card attached to it, so the planet is worth 3
 * more resources and 3 more influence wherever a payment counts it. The replay already purges a hero when it is
 * played. The Space Cannon is combat, which the plan does not roll. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:titanshero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
