/**
 * Colonial Redistribution (agenda, directive): "Destroy each unit on the elected planet. Then, the player who controls
 * that planet chooses 1 player with the fewest victory points - that player may place 1 infantry from their
 * reinforcements on that planet."
 *
 * Decided: play. The units on the elected planet, ground forces and structures alike, leave the board the plan counts;
 * the planet is the entry's choice (`choices.planet`). The infantry placed then is another player's choice and is not
 * modelled.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:redistribution';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ state, choices }) => {
    const planet = String(choices.planet ?? '');
    if (planet === '') return;
    delete state.ground[planet];
    delete state.pds[planet];
    state.docks = state.docks.filter(dock => dock !== planet);
  },
};
