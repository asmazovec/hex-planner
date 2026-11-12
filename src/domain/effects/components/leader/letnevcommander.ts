/**
 * Rear Admiral Farran (Barony of Letnev, commander): "After 1 of your units uses SUSTAIN DAMAGE: You may gain 1 trade
 * good."
 *
 * A hint of the combat: the plan does not replay hits or SUSTAIN DAMAGE, so it cannot know when the trade good comes;
 * the player enters it as any other trade good gained.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:letnevcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
