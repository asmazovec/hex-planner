/**
 * Nip and Tuck, Children of Ordinian (Last Bastion, commander): "At any time: Your action cards cannot be canceled by
 * "Sabotage" action cards. The Nekro Virus cannot place assimilator tokens on your components."
 *
 * A hint. Another player's Sabotage and the Nekro's Valefar Assimilator tokens are reactions of other players, which
 * the plan does not model: no check of the replay speaks of a card cancelled or of an assimilator token. The reminder
 * stands where my action cards are played (`component`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:bastioncommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
