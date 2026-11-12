/**
 * Plasma Scoring (technology, base game): "When 1 or more of your units use BOMBARDMENT or SPACE CANNON, 1 of those
 * units may roll 1 additional die."
 *
 * A hint: it adds a die to a roll, and the plan rolls no dice. SPACE CANNON is fired in the battle in space and before
 * it (`combat`), BOMBARDMENT in the invasion (`invasion`), so the reminder stands in both blocks.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ps';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
