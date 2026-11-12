/**
 * Counterstroke (action card, After another player activates a system that contains 1 of your command tokens):
 * "Return that command token to your tactic pool."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `systemId`:
 * my command token leaves that system for my tactic pool. A system without my token is warned of. Pass 1 keeps it the
 * hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:counterstroke';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
