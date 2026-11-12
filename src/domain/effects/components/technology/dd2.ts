/**
 * Destroyer II (unit upgrade, base game): "Cost 1, Combat 8, Move 2 / ANTI-FIGHTER BARRAGE 6(x3)"
 *
 * Generated from the unit table (`unitUpgrades.ts`, LRR 97.4). Of what the plan counts nothing changes: cost 1 and
 * move 2 are those of Destroyer I, and a destroyer has no capacity at either level. Combat and ANTI-FIGHTER BARRAGE
 * are rolls, which the plan does not make.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:dd2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
