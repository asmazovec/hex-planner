/**
 * Rickar Rickani (Winnu, commander): "During combat: Apply +2 to the result of each of your unit's combat rolls in the
 * Mecatol Rex system, your home system, and each system that contains a legendary planet."
 *
 * Decided: a hint in the combat step. The plan rolls no dice and simulates no combat, so a bonus to combat rolls has
 * nothing to count or validate.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:winnucommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
