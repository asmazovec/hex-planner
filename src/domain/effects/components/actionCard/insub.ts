/**
 * Insubordination (action card, Action): "Remove 1 token from another player's tactic pool and return it to their
 * reinforcements."
 *
 * Pass 2 makes it a `play` with the choice `player`: one token leaves that opponent's tactic pool. A player with no
 * token in the tactic pool cannot be chosen (tirules2 ruling 1): LRR 2.6.1, a component action that cannot be resolved
 * completely, is warned of with `componentUnresolved`. Pass 1 keeps it the hint it is today; its tests say what it
 * must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:insub';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
