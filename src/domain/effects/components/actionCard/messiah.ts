/**
 * Rise of a Messiah (action card, Action): "Place 1 infantry from your reinforcements on each planet you control."
 *
 * Pass 2 makes it a `play`: one infantry from the reinforcements on each planet the player controls when it is
 * resolved. Pass 1 keeps it the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:messiah';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
