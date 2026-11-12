/**
 * "Any time you have more ocean cards than there are planets that contain your coexisting units, discard ocean
 * cards until you do not. When your units begin coexisting on a planet: gain an ocean card and ready it."
 *
 * Hint. Ocean cards and coexistence are not counted by the plan.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:oceanbound';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
