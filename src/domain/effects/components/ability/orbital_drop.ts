/**
 * Orbital Drop (Federation of Sol, ability): "ACTION: Spend 1 token from your strategy pool to place 2 infantry from
 * your reinforcements on 1 planet you control."
 *
 * Pass 1: a hint. Decided: `play`. A component action naming the ability (choices.planet): 1 token from the strategy pool
 * (the pool going below zero is warned of), 2 infantry from reinforcements on that planet, which must be one the player controls.
 */
import { placeOnPlanet } from '../../../replay/invasion';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'ability:orbital_drop';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ game, choices, state, warnings }) => {
    // The ability is printed on the Federation of Sol's sheet only: another faction naming it places nothing.
    if (game.faction !== 'sol') return;
    state.strategy -= 1;
    if (state.strategy < 0) warnings.push(violation('poolNegative', { pool: 'strategy', have: state.strategy }));
    if (typeof choices.planet === 'string') placeOnPlanet(state, choices.planet, { infantry: 2 }, warnings);
  },
};
