/**
 * L4 Disruptors (Barony of Letnev, technology): "During an invasion, units cannot use SPACE CANNON against your units."
 *
 * A hint of the invasion: Space Cannon Defense is a roll of dice, which the plan does not make.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:l4';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
