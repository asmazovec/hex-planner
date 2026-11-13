/**
 * Imperial Arbiter (agenda): "The elected player gains this card. At the end of the strategy phase, the owner of
 * this card may discard this card to swap 1 of their strategy cards with 1 of another player's strategy cards."
 *
 * A hint. The swap of strategy cards happens at the end of the strategy phase and the plan simply takes the card
 * the player ends with as the card of the round; nothing is counted or validated.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:arbiter';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
