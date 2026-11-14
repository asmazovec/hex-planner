/**
 * Unstable Planet (action card, Action): "Choose 1 hazardous planet. Exhaust that planet and destroy up to 3 infantry
 * on it."
 *
 * A `play` of a component action with the choice `planetId`: the hazardous planet is exhausted for whoever controls
 * it and up to 3 infantry on it are destroyed (all of them when there are fewer). A planet that is not hazardous is
 * warned of.
 */
import { planet, removeUnits } from '../../../../game/abilities/emit';
import type { GameEvent, Ability } from '../../../../game/abilities/types';
import { unmetBy } from '../../helpers/cardPlay';

export const id = 'actionCard:unstable';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planetId', kind: 'planet',
    options: ctx => Object.values(ctx.pack.planets).filter(planet => planet.traits?.includes('hazardous')).map(planet => planet.id),
  }],
  holder: 'self',
  play: ctx => {
    if (ctx.choices.planetId === undefined) return [];
    const planetId = String(ctx.choices.planetId);
    if (!ctx.pack.planets[planetId]?.traits?.includes('hazardous')) unmetBy(ctx);
    const held = ctx.board.planets[planetId];
    const owner = held?.owner;
    if (owner === undefined) return [];
    const events: GameEvent[] = held.exhausted ? [] : [planet.exhaust(owner, planetId)];
    const infantry = Math.min(3, ctx.of(owner).unitsOn(planetId).infantry ?? 0);
    if (infantry > 0) events.push(removeUnits(owner, { planet: planetId }, { infantry }));
    return events;
  },
};
