/**
 * Lucky Shot (action card, Action): "Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet
 * you control."
 *
 * Pass 2 makes it a `play` with the choices `system`, `player`, `unit`: one dreadnought, cruiser or destroyer of that
 * opponent in that system is destroyed. A system without a planet the player controls, another unit type or one's own
 * units cannot be chosen (tirules2 ruling 1): `componentUnresolved` (2.6.1). Pass 1 keeps it the hint it is today; its
 * tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:lucky';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
