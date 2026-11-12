/**
 * Infantry II (unit upgrade, base game): "Cost 1(x2), Combat 7 / After this unit is destroyed, roll 1 die. If the
 * result is 6 or greater, place the unit on this card. At the start of your next turn, place each unit that is on this
 * card on a planet you control in your home system."
 *
 * Generated from the unit table (`unitUpgrades.ts`, LRR 97.4); the cost stays one for two. The return of destroyed
 * infantry hangs on a roll, which the plan does not make: a returned infantry is entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:inf2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
