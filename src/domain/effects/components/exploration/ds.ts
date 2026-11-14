/**
 * Dyson Sphere (cultural exploration, Prophecy of Kings): "This planet's resource value is increased by 2 and its
 * influence value is increased by 1."
 *
 * Decided: `play` that attaches, then a change of numbers. Played in the `uses` of the tactical action whose landing
 * takes control of the planet, it is attached to that planet (`attachments`, 35.8, 12.2: it stays with the planet
 * whoever controls it). The planet's values are then two resources and one influence higher wherever the count asks
 * them (`planetResources`, `planetInfluence`): a payment, a dock's Production, Hoard Raw Materials. Pass 2: written.
 */
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ds';

/**
 * Passive, because only a passive `modify` is asked of a card attached to a planet (`appliedToPlanet`); it attaches in
 * `play`, which runs for any tier when the entry names the card. "This planet" is the planet of the entry's landing
 * that is now mine and has no Dyson Sphere yet (`onGainControl` is not asked of a passive effect that is only named).
 */
export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { planetResources: value => value + 2, planetInfluence: value => value + 1 },
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (entry?.type !== 'tactical') return [];
    const planetId = entry.landings.map(landing => landing.planetId).find(p => ctx.board.planets[p]?.owner === ctx.holder && !ctx.board.planets[p].attached.includes(id));
    return planetId === undefined ? [] : [{ type: 'CardAttached', planet: planetId, card: id }];
  },
};
