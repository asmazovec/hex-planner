/**
 * Repeal Law (action card, Action): "Discard 1 law from play."
 *
 * Pass 2 makes it a `play` with the choice `law`: that law leaves play for the whole game, as a law in `spends`
 * already does. Without a law in play the card cannot be resolved (tirules2 ruling 1): `componentUnresolved` (2.6.1).
 * Pass 1 keeps it the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:repeal';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
