/**
 * Covert Legislation (directive): "When this agenda is revealed, the speaker draws the next card in the agenda deck
 * but does not reveal it to the other players. Instead, the speaker reads the eligible outcomes aloud (for, against,
 * elect Elect Player, etc.). The other Players vote for these outcomes as if they were outcomes of this agenda,
 * without knowing their effects."
 *
 * Decided: hint. It is about the vote only (which card is voted on, unseen); the plan counts no votes, so nothing is
 * validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:covert';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
