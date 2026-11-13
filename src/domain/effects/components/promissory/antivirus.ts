/**
 * Antivirus (Nekro Virus, promissory note): "At the start of a combat: Place this card faceup in your play area. While
 * this card is in your play area, the Nekro player cannot use their Technological Singularity faction ability against
 * you. If you activate a system that contains 1 or more of the Nekro player's units, return this card to the Nekro
 * player."
 *
 * A hint at the combat: it only stops another player's ability that fires on units destroyed in combat, and the plan
 * fights no combat. The return on an activation is not replayed.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:antivirus';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
