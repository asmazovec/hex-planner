/**
 * Prototype War Sun II (Embers of Muaat, unit upgrade): "Cost 10, Combat 3(x3), Move 3, Capacity 6 / SUSTAIN DAMAGE,
 * BOMBARDMENT 3(x3) / Other players' units in this system lose PLANETARY SHIELD."
 *
 * Decided: the generated level II (`unitUpgrades.ts`, 97.4) already gives the numbers the plan counts (move, capacity,
 * cost); this file adds nothing to them. The last sentence speaks of Bombardment and Planetary Shield, which the plan
 * does not count; a unit upgrade is `passive`, so it cannot carry a step of its own as a hint does.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:pws2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
