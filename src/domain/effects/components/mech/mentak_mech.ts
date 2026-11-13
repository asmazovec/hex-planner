/**
 * Moll Terminus (Mentak Coalition, mech): "Other player's ground forces on this planet cannot use SUSTAIN DAMAGE."
 *
 * Decided: a hint at the invasion: SUSTAIN DAMAGE is part of combat, which the plan does not count.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:mentak_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
