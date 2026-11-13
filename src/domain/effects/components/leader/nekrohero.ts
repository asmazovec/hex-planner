/**
 * UNIT.DSGN.FLAYESH (Nekro Virus, hero): "ACTION: Choose a planet that has a technology specialty in a system that
 * contains your units. Destroy any other player's units on that planet. Gain trade goods equal to the planet's combined
 * resource and influence values and gain 1 technology that matches the specialty of that planet. Then, purge this card."
 *
 * A `play` effect of its component action, with the choices `planet` and `technology`: the other players' ground forces
 * and structures on the planet are removed, the trade goods of its resources plus influence are gained and the
 * technology is gained (not researched, so Propagation does not replace it). The hero is purged by the replay.
 */
import { componentsOf } from '../../../components';
import type { ComponentEffect } from '../../types';

export const id = 'leader:nekrohero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'planet', kind: 'planet', options: ({ pack }) => Object.values(pack.planets).filter(planet => planet.tech?.length).map(planet => planet.id) },
    {
      // The technologies of the colour of the planet's specialty that the player can gain: no faction card, no unit upgrade, none held yet.
      key: 'technology', kind: 'component', label: { ru: 'Технология', en: 'Technology' }, when: chosen => chosen.planet !== undefined,
      options: ({ pack, state, chosen }) => {
        const colours = pack.planets[String(chosen.planet ?? '')]?.tech ?? [];
        return componentsOf(pack)
          .filter(def => def.kind === 'technology' && !def.faction && !state.holdings.technologies.includes(def.id))
          .filter(def => { const tech = pack.technologies[def.id.slice('technology:'.length)]; return !!tech?.type && !tech.upgrade && colours.includes(tech.type); })
          .map(def => def.id);
      },
    },
  ],
  play: ({ choices, states, state, player, pack, held }) => {
    if (!held) return;
    const planetId = String(choices.planet ?? '');
    const planet = pack.planets[planetId];
    if (!planet) return;
    for (const [owner, other] of Object.entries(states)) {
      if (owner === player) continue;
      delete other.ground[planetId];
      delete other.pds[planetId];
      other.docks = other.docks.filter(dock => dock !== planetId);
    }
    state.tradeGoods += planet.resources + planet.influence;
    const technology = String(choices.technology ?? '');
    if (technology && !state.holdings.technologies.includes(technology)) state.holdings.technologies.push(technology);
  },
};
