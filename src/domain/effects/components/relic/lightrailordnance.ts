/**
 * Lightrail Ordnance (relic, Thunder's Edge): "Your space docks gain SPACE CANNON 5 (x2). You may use your space dock's
 * SPACE CANNON against ships that are adjacent to their systems."
 *
 * A hint: Space Cannon is a roll of dice (77), and the plan neither rolls nor checks who may fire at whom; only the
 * losses of a battle are entered. The text stands in the block of the battle.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:lightrailordnance';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
