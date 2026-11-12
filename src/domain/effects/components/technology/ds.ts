/**
 * Dimensional Splicer (Ghosts of Creuss, technology): "At the start of space combat in a system that contains a
 * wormhole and 1 or more of your ships, you may produce 1 hit and assign it to 1 of your opponent's ships."
 *
 * A hint: a hit at the start of space combat. The plan simulates no combat; the reminder stands in the block of the battle.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ds';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
