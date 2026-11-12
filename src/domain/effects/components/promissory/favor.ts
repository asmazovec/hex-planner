/**
 * Political Favor (Xxcha, promissory note): "When an agenda is revealed: Remove 1 token from the Xxcha player's
 * strategy pool and return it to their reinforcements. Then, discard the revealed agenda and reveal 1 agenda from the
 * top of the deck. Players vote on this agenda instead. Then, return this card to the Xxcha player."
 *
 * Decided: a hint with no step. Agendas and votes are not planned, and the token it removes is another player's (the
 * Xxcha's): a waiver or a play is asked of the owner of the entry only.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:favor';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
