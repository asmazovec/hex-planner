/**
 * War Sun (unit upgrade, base game): "Cost 12, Combat 3(x3), Move 2, Capacity 6 / SUSTAIN DAMAGE, BOMBARDMENT 3(x3) /
 * Other players' units in this system lose PLANETARY SHIELD."
 *
 * The numbers are those of the faction sheet's war sun, generated from the unit table (`unitUpgrades.ts`). What the
 * technology really does is unlock the unit: "A player without the war sun unit upgrade technology cannot produce,
 * place or have a war sun on the board for any reason" (tirules2, units, War Sun 1). The replay does not check that
 * yet; pass 2 adds the check for everyone and this file waives it. The lost PLANETARY SHIELD belongs to the combat.
 * Pass 1: the generated effect as it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ws';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
