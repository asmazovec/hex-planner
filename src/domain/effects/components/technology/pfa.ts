/**
 * Pre-Fab Arcologies (Naaz-Rokha Alliance, technology): "After you explore a planet, ready that planet."
 *
 * A hint. Exploration is not planned, so the moment the planet is readied does not exist in the plan; readying a
 * planet by hand stays the adjustment it is.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:pfa';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
