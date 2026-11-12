/**
 * Orbital Drop (Federation of Sol, ability): "ACTION: Spend 1 token from your strategy pool to place 2 infantry from
 * your reinforcements on 1 planet you control."
 *
 * Pass 1: a hint. Decided: `play`. A component action naming the ability (choices.planet): 1 token from the strategy pool
 * (the pool going below zero is warned of), 2 infantry from reinforcements on that planet, which must be one the player controls.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:orbital_drop';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
