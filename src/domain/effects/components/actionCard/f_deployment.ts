/**
 * Frontline Deployment (action card; "Action"): "Place 3 infantry from your reinforcements on 1 planet you control."
 *
 * Decided: `play`. A component action that puts 3 infantry on the planet chosen (`choices.planet`), all three on that
 * one planet (ruling). A planet the player does not control is warned of by `placeOnPlanet` (`placeNotControlled`,
 * 67.4.1); the infantry are placed all the same, as a warning forbids nothing.
 */
import { placeOnPlanet } from '../../../replay/invasion';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_deployment';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ choices, state, warnings }) => {
    const planet = String(choices.planet ?? '');
    if (planet) placeOnPlanet(state, planet, { infantry: 3 }, warnings, 'component');
  },
};
