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
import { card, removeUnits, structures, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { othersBy } from '../../helpers/cardPlay';

export const id = 'leader:nekrohero';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'planet', kind: 'planet', options: ({ pack }) => Object.values(pack.planets).filter(planet => planet.tech?.length).map(planet => planet.id) },
    {
      // The technologies of the colour of the planet's specialty that the player can gain: no faction card, no unit upgrade, none held yet.
      key: 'technology', kind: 'component', label: { ru: 'Технология', en: 'Technology' }, when: chosen => chosen.planet !== undefined,
      options: ({ pack, my, chosen }) => {
        const colours = pack.planets[String(chosen.planet ?? '')]?.tech ?? [];
        return componentsOf(pack)
          .filter(def => def.kind === 'technology' && !def.faction && !my.holds(def.id))
          .filter(def => { const tech = pack.technologies[def.id.slice('technology:'.length)]; return !!tech?.type && !tech.upgrade && colours.includes(tech.type); })
          .map(def => def.id);
      },
    },
  ],
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const planetId = String(ctx.choices.planet ?? '');
    const planet = ctx.pack.planets[planetId];
    if (!planet) return [];
    const events = othersBy(ctx).flatMap(who => {
      const ground = ctx.of(who).unitsOn(planetId);
      const built = ctx.of(who).structures().find(each => each.planet === planetId)?.structures ?? {};
      return [
        ...(Object.keys(ground).length > 0 ? [removeUnits(who, { planet: planetId }, ground)] : []),
        ...(Object.keys(built).length > 0 ? [structures.remove(who, planetId, built)] : []),
      ];
    });
    events.push(tradeGoods(ctx.holder, planet.resources + planet.influence));
    const technology = String(ctx.choices.technology ?? '');
    if (technology && !ctx.my.holds(technology)) events.push(card.gain(ctx.holder, technology));
    return events;
  },
};
