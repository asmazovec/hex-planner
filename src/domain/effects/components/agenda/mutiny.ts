/**
 * Mutiny (agenda): "For: Each player that voted "For" gains 1 victory point. Against: Each player that voted "For"
 * loses 1 victory point."
 *
 * A hint. Victory points by the votes cast; votes are not counted, the player enters points by hand.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:mutiny';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
