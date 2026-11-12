/**
 * Carrier II (unit upgrade, base game): "Cost 3, Combat 9, Move 2, Capacity 6"
 *
 * A `modify` generated from the unit table (`unitUpgrades.ts`, LRR 97.4): move 2 instead of 1 and capacity 6 instead
 * of 4; the cost stays 3. This file adds nothing to the generated numbers.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:cv2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
