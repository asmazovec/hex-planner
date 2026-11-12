/**
 * Infiltrate (action card, When you gain control of a planet): "Replace each PDS and space dock that is on that planet
 * with a matching unit from your reinforcements."
 *
 * Pass 2 makes it a `play`, named in the `uses` of the tactical action whose landing gains the planet: where the
 * replay destroys the other player's PDS and space dock on a planet taken (49.5.1, 63.4, 79.4), the card puts the same
 * structures of the player's own reinforcements there. Pass 1 keeps it the hint it is today; its tests say what it
 * must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:infiltrate';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  onGainControl: ({ state, planetId, lost }) => {
    for (const structure of lost) {
      if (structure.kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + structure.count;
      else if (!state.docks.includes(planetId)) state.docks.push(planetId);
    }
  },
};
