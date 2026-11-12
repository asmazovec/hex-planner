/**
 * Book of Latvinia (relic): "When you gain this card, research up to 2 technologies that have no prerequisites.
 * ACTION: Purge this card; if you control planets that have all 4 types of technology specialties, gain 1 victory
 * point. Otherwise, gain the speaker token."
 *
 * Decided (pass 2): play. The action gives 1 victory point when the planets I control show all four specialties; the
 * speaker token is not counted by the plan. The technologies researched on gaining it are entered as gains of the same
 * entry. The replay already purges the relic. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:bookoflatvinia';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state, pack, held }) => {
    if (!held) return;
    const types = new Set(Object.keys(state.control)
      .filter(planetId => state.control[planetId] === 'me')
      .flatMap(planetId => pack.planets[planetId]?.tech ?? []));
    if (types.size >= 4) state.vp += 1;
  },
};
