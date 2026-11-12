/**
 * E-Res Siphons (Universities of Jol-Nar, faction technology): "After another player activates a system that contains
 * 1 or more of your ships, gain 4 trade goods."
 *
 * A hint in the block of the activation. Its trigger is another player's activation, and the actions of opponents
 * entered in the plan do not change my totals (only the control of a planet they land on does), so the 4 trade goods
 * are not counted by the replay; the player enters them by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ers';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
