/**
 * Cripple Defenses (action card; "Action"): "Choose 1 planet. Destroy each PDS on that planet."
 *
 * Decided: `play`. It is a component action that changes the board the plan counts: every PDS on the chosen planet
 * (`choices.planet`), whoever's, is destroyed and goes back to its owner's reinforcements. The planet may hold no PDS
 * (ruling): then nothing happens and nothing is warned of.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:cripple';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ choices, states }) => {
    const planet = String(choices.planet ?? '');
    if (!planet) return;
    for (const state of Object.values(states)) delete state.pds[planet];
  },
};
