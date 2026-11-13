/**
 * S'ula Mentarion (Mentak Coalition, commander): "After you win a space combat: You may force your opponent to give
 * you 1 promissory note from their hand."
 *
 * Decided: a hint at the space combat: the plan does not decide who wins; the note given is entered by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:mentakcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
