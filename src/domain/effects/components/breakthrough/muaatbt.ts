/**
 * Stellar Genesis (Embers of Muaat, breakthrough, Thunder's Edge): "When you gain this card, place the Avernus planet
 * token into a non-home system that is adjacent to a planet you control; gain the Avernus planet card and ready it.
 * After you move one of your war suns out of or through Avernus's system and into a non-home system, you may move the
 * Avernus token with it."
 *
 * Decided: `play` when gained: the Muaat gains the Avernus planet card, ready (control of `avernus`). The token on the
 * map and its moving with a war sun are not modelled: the replay does not put planets into systems. Pass 1: still the
 * hint it is today.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/abilities/types';

export const id = 'breakthrough:muaatbt';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

/** Avernus is taken and readied. The hooks of a planet gained do not run for it: a hook that takes a planet does not start the others. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    // The token's place on the map and its moving with a war sun are not replayed; the planet card is.
    gained: ctx => {
      const held = ctx.my.planets().find(planet => planet.id === 'avernus');
      const events: GameEvent[] = held === undefined ? [{ type: 'PlanetGained', player: ctx.holder, planet: 'avernus' }] : [];
      if (held?.exhausted) events.push({ type: 'PlanetReadied', player: ctx.holder, planet: 'avernus' });
      return events;
    },
  },
};
