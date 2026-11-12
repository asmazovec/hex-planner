/**
 * Mining Initiative (action card, Action): "Gain trade goods equal to the resource value of 1 planet you control."
 *
 * Pass 2 makes it a `play` with the choice `planet`: trade goods equal to the resources of one planet the player
 * controls; the planet is not exhausted (tirules2 ruling 2). A planet not controlled cannot be chosen:
 * `componentUnresolved` (2.6.1). Pass 1 keeps it the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:mining_initiative';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
