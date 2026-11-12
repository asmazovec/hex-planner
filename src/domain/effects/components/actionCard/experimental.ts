/**
 * Experimental Battlestation (action card; "After the active player moves ships into the active system during a
 * tactical action"): "Choose 1 of your space docks that is either in or adjacent to that system. That space dock uses
 * SPACE CANNON 5(x3) against the active player's ships in the active system."
 *
 * A hint in the movement block, where its window is: Space Cannon fires dice, and the plan rolls none; the ships it
 * destroys are entered as losses.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:experimental';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
