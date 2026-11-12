/**
 * Reactor Meltdown (action card, Action): "Destroy 1 space dock in a non-home system."
 *
 * Pass 2 makes it a `play` with the choice `planet`: the space dock of another player on that planet is destroyed. A
 * dock in a home system, or the player's own dock, cannot be chosen (tirules2 rulings 1 and 3): `componentUnresolved`
 * (2.6.1). Pass 1 keeps it the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:meltdown';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
