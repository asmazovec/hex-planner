/**
 * Graviton Laser System: "You may exhaust this card before 1 or more of your units uses SPACE CANNON; hits produced by
 * those units must be assigned to non-fighter ships if able."
 *
 * A hint at the combat: SPACE CANNON is dice and the assignment of hits, neither of which the plan simulates.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:gls';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
