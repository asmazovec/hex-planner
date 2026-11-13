/**
 * Committee Formation (agenda, law): "The elected player gains this card. Before players vote on an agenda that
 * requires a player to be elected, the owner of this card may discard this card to choose a player to be elected.
 * Players do not vote on that agenda."
 *
 * A hint: it speaks of votes and elections only, which the plan does not count.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:committee';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
