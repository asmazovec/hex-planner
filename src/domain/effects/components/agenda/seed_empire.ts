/**
 * Seed of an Empire (agenda): "For: The player with the most victory points gains 1 victory point. Against: The
 * player with the fewest victory points gains 1 victory point."
 *
 * A hint. A directive on victory points decided by the standings and the vote; the player enters the point by hand.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:seed_empire';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
