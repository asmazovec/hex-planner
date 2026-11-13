/**
 * Tekklar Legion (Sardakk N'orr, promissory note): "At the start of an invasion combat: Apply +1 to the result of each
 * of your unit's combat rolls during this combat. If your opponent is the N'orr player, apply -1 to the result of each
 * of their unit's combat rolls during this combat. Then, return this card to the N'orr player."
 *
 * A hint in the block of the invasion. The card changes combat rolls only, and the plan rolls no dice: nothing it
 * counts or checks depends on them. Played, it is entered in the `spends` of the entry; its return to the N'orr player
 * (69.3) is done by the replay for every note whose text says so.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:tekklar';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
