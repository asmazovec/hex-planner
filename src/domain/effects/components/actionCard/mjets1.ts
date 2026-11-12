/**
 * Maneuvering Jets (action card, Before you assign hits produced by another player's SPACE CANNON roll): "Cancel 1
 * hit."
 *
 * A hint at the combat step: the hits of a SPACE CANNON roll are dice the plan does not roll; the ship that survives
 * stays in the plan as entered.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:mjets1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
