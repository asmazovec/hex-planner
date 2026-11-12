/**
 * Unexpected Action (action card, Action): "Remove 1 of your command tokens from the game board and return it to your
 * reinforcements."
 *
 * A `play` of a component action with the choice `systemId`: my command token leaves that system for my
 * reinforcements (not for a pool). A system without my token is warned of. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:unexpected';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
