/**
 * Gurno Aggero, Armageddon Relay (Clan of Saar, hero): "ACTION: Choose 1 system that is adjacent to 1 of your space
 * docks. Destroy all other players' infantry and fighters in that system. Then, purge this card."
 *
 * Decided (pass 2 to build): a `play` effect of its component action with the choice `system`: every other player's
 * infantry and fighters in that system, in its space area and on its planets, are destroyed; mine stay. The replay
 * already purges a hero when it is played. A system that is not adjacent to one of my docks (a dock's own system is
 * not adjacent to itself, Saar note on the hero) is a breach still to be checked.
 */
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'leader:saarhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
  play: ({ game, pack, states, player, choices }) => {
    const slot = String(choices.system ?? '');
    if (slot === '') return;
    const planets = planetsOf(game, slot, pack);
    // Every other player's infantry and fighters, in the space area and on the planets of the system.
    for (const [who, other] of Object.entries(states)) {
      if (who === player) continue;
      for (const counts of [other.systems[slot], ...planets.map(planet => other.ground[planet])]) {
        if (!counts) continue;
        delete counts.infantry;
        delete counts.fighter;
      }
    }
  },
};
