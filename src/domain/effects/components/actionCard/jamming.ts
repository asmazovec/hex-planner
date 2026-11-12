/**
 * Signal Jamming (action card, Action): "Choose 1 non-home system that contains or is adjacent to 1 of your ships.
 * Place a command token from another player's reinforcements in that system."
 *
 * A `play` of a component action with the choices `systemId` and `player`: that player's command token comes from
 * their reinforcements into the system. The card's own condition (a non-home system that contains or is adjacent to
 * one of my ships) is warned of when it is not met. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:jamming';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
