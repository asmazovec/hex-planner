/**
 * Blitz (action card, At the start of an invasion): "Each of your non-fighter ships in the active system that do not
 * have BOMBARDMENT gain BOMBARDMENT 6 until the end of the invasion."
 *
 * A hint: BOMBARDMENT is a roll of the invasion, which the plan does not simulate. Its step, the invasion, comes from
 * the card's window.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:blitz';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
