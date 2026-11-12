/**
 * Aeurex Mechanica (Industrex, Thunder's Edge): "You may exhaust this card when you pass to place 1 ship that matches
 * a unit upgrade technology you own from your reinforcements into a system that contains your ships."
 *
 * Pass 1: a hint. To become a `play`: named in the `uses` of a pass entry with the choices `unit` and `system`, it
 * places that ship; a ship whose unit upgrade is not owned, a system without the player's ships, or an entry that is
 * not a pass is warned of, and the ship is placed all the same.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:industrex';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
