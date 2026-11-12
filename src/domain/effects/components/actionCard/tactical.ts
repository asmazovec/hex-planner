/**
 * Tactical Bombardment (action card, Action): "Choose 1 system that contains 1 or more of your units that have
 * BOMBARDMENT. Exhaust each planet controlled by other players in that system."
 *
 * A `play` of a component action with the choice `systemId`: every planet of other players in that system is
 * exhausted. The card's own condition (a unit of mine with BOMBARDMENT in the system) is warned of when it is not
 * met. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:tactical';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
