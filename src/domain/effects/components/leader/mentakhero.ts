/**
 * Ipswitch, Loose Cannon (Mentak Coalition, hero): "At the start of a space combat that you are participating in:
 * You may purge this card. if you do, for each other player's ship that is destroyed during this combat, place 1
 * ship of that type from your reinforcements in the active system."
 *
 * Decided: a hint at the space combat: the ships destroyed are an outcome of combat the plan does not simulate.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:mentakhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
