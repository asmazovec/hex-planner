/**
 * Uprising (action card, Action): "Exhaust 1 non-home planet controlled by another player. Then gain trade goods
 * equal to its resource value."
 *
 * A `play` of a component action with the choice `planetId`: the other player's planet is exhausted and I gain trade
 * goods equal to its resources. A home planet, a planet of mine or an exhausted one is warned of. Pass 1 keeps it the
 * hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:uprising';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
