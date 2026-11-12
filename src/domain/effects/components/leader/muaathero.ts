/**
 * Adjudicator Ba'al, Nova Seed (Embers of Muaat, hero): "After you move a war sun into a non-home system other than
 * Mecatol Rex: You may destroy all other players' units in that system and replace that system tile with the Muaat
 * supernova tile. If you do, purge this card and each planet card that corresponds to the replaced system tile."
 *
 * Decided: `play`, named in the `uses` of the tactical action that moved the war sun (purged as every hero is). What
 * it does to the board, a tile replaced by a supernova and the other players' units destroyed, cannot be replayed:
 * the replay never changes the map. Pass 1: still the hint it is today.
 */
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'leader:muaathero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Named with the move of the war sun: the other players' units in the active system are destroyed. The tile
  // replaced by the supernova and the planet cards purged are not replayed (the replay never changes the map).
  play: ({ entry, game, pack, states, player }) => {
    if (entry.type !== 'tactical' || entry.systemId === null) return;
    const slot = entry.systemId;
    const planets = planetsOf(game, slot, pack);
    for (const [who, other] of Object.entries(states)) {
      if (who === player) continue;
      delete other.systems[slot];
      for (const planetId of planets) {
        delete other.ground[planetId];
        delete other.pds[planetId];
        other.docks = other.docks.filter(dock => dock !== planetId);
      }
    }
  },
};
