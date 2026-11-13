/**
 * Blood Pact (Empyrean, promissory note):
 * ACTION: Place this card faceup in your play area. When you and the Empyrean player cast votes for the same
 * outcome, cast 4 additional votes for that outcome. If you activate a system that contains 1 or more of the
 * Empyrean player's units, return this card to the Empyrean player.
 *
 * A hint. The votes are not counted by the plan. The return of the card when its holder activates a system with the
 * Empyrean player's units is a change of holdings, but only of a card played face up, and the holdings do not tell a
 * note in hand from one in a play area (69.5.1 is not modelled): the reminder stands at the activation.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:blood_pact';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation'] };
