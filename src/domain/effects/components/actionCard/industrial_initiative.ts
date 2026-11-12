/**
 * Industrial Initiative (action card, Action): "Gain 1 trade good for each industrial planet you control."
 *
 * Pass 2 makes it a `play`: the component action gains 1 trade good for each industrial planet its player controls
 * when it is resolved (a planet trait, 64.3). Zero industrial planets is a legal play that gains nothing (tirules2
 * ruling 1). Written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:industrial_initiative';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state, pack }) => {
    const industrial = Object.keys(state.control).filter(planetId => state.control[planetId] === 'me' && pack.planets[planetId]?.traits?.includes('industrial'));
    state.tradeGoods += industrial.length;
  },
};
