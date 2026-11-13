/**
 * Rear Admiral Farran (Barony of Letnev, commander): "After 1 of your units uses SUSTAIN DAMAGE: You may gain 1 trade
 * good."
 *
 * A hint of the combat: the plan does not replay hits or SUSTAIN DAMAGE, so it cannot know when the trade good comes;
 * the player enters it as any other trade good gained.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:letnevcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
