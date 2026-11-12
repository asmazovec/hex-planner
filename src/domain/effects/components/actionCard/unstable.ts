/**
 * Unstable Planet (action card, Action): "Choose 1 hazardous planet. Exhaust that planet and destroy up to 3 infantry
 * on it."
 *
 * A `play` of a component action with the choice `planetId`: the hazardous planet is exhausted for whoever controls
 * it and up to 3 infantry on it are destroyed (all of them when there are fewer). A planet that is not hazardous is
 * warned of.
 */
import type { ComponentEffect } from '../../types';
import { controllerOf, exhaust, unmet } from '../../helpers/cardPlay';
import { removeUnits } from '../../../replay/state';

export const id = 'actionCard:unstable';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planetId', kind: 'planet',
    options: ctx => Object.values(ctx.pack.planets).filter(planet => planet.traits?.includes('hazardous')).map(planet => planet.id),
  }],
  play: turn => {
    if (turn.choices.planetId === undefined) return;
    const planetId = String(turn.choices.planetId);
    if (!turn.pack.planets[planetId]?.traits?.includes('hazardous')) unmet(turn);
    const holder = controllerOf(turn, planetId);
    const owner = holder === undefined ? undefined : turn.states[holder];
    if (!owner) return;
    exhaust(owner, planetId);
    const here = owner.ground[planetId] ?? {};
    removeUnits(owner.ground, planetId, { infantry: Math.min(3, here.infantry ?? 0) });
  },
};
