/**
 * War Effort (action card, Action): "Place 1 cruiser from your reinforcements in a system that contains 1 or more of
 * your ships."
 *
 * A `play` of a component action with the choice `systemId`: a cruiser from my reinforcements is placed there. A
 * system without my ships is warned of; the fleet pool still limits the ships. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:war_effort';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
