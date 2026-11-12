/**
 * Industrial Initiative (action card, Action): "Gain 1 trade good for each industrial planet you control."
 *
 * Pass 2 makes it a `play`: the component action gains 1 trade good for each industrial planet its player controls
 * when it is resolved (a planet trait, 64.3). Zero industrial planets is a legal play that gains nothing (tirules2
 * ruling 1). Pass 1 keeps it the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:industrial_initiative';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
