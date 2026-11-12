/**
 * Crimson Legionnaire II (Mahact, unit upgrade):
 * Cost 1(x2), Combat 7 After this unit is destroyed, gain 1 commodity or convert 1 of your commodities to a
 * trade good. Then, place the unit on this card. At the start of your next turn, place each unit that is on this
 * card on a planet you control in your home system.
 *
 * Passive: the generated numbers of the upgrade. Red in pass 1: an infantry destroyed comes back on a planet of the
 * home system at the start of my next turn. The commodity gained or converted is the player's choice (not counted).
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:cl2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
