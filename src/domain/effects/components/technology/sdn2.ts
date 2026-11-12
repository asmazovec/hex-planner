/**
 * Super Dreadnought II (L1Z1X Mindnet, unit upgrade): "Cost 4, Combat 4, Move 2, Capacity 2 SUSTAIN DAMAGE,
 * BOMBARDMENT 4 This unit cannot be destroyed by "Direct Hit" action cards."
 *
 * Decided: a unit upgrade, already complete. Its numbers (Move 2, Capacity 2, Cost 4) are generated from the unit
 * tables (unitUpgrades.ts, LRR 97.4); this file adds nothing to them, so it keeps the generated tier and rule. The
 * line about "Direct Hit" speaks of an action card of combat, which the plan does not resolve; a unit upgrade is
 * passive and cannot carry the steps of a hint, so it is not shown as a reminder.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:sdn2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
