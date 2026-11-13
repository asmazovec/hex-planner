/**
 * War Funding (Barony of Letnev, promissory note): "After you and your opponent roll dice during space combat: You may
 * reroll all of your opponent's dice. You may reroll any number of your dice. Then, return this card to the Letnev
 * player."
 *
 * A hint of the combat: the plan rolls no dice, so nothing is counted or validated. Playing the note is the replay's
 * own business already: the Letnev cannot play their own note (69.2), another player returns it after use (69.3).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:war_funding';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
