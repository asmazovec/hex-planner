/**
 * Ambush (Mentak Coalition, faction ability): "At the start of a space combat: You may roll 1 die for each of up to
 * 2 of your cruisers or destroyers in the system. For each result equal to or greater than that ship's combat value,
 * produce 1 hit; your opponent must assign it to 1 of their ships."
 *
 * Decided: a hint at the space combat: dice the plan does not roll.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:ambush';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
