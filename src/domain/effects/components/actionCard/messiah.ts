/**
 * Rise of a Messiah (action card, Action): "Place 1 infantry from your reinforcements on each planet you control."
 *
 * Pass 2 makes it a `play`: one infantry from the reinforcements on each planet the player controls when it is
 * resolved. Written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:messiah';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state }) => {
    for (const planetId of Object.keys(state.control).filter(planet => state.control[planet] === 'me')) {
      const there = (state.ground[planetId] ??= {});
      there.infantry = (there.infantry ?? 0) + 1;
    }
  },
};
