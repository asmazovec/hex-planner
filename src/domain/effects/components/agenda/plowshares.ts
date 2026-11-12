/**
 * Swords to Plowshares (agenda):
 * "For: Each player destroys half of their infantry on each planet they control, rounded up. Then, each player
 * gains trade goods equal to the number of their infantry that were destroyed. Against: Each player places 1
 * infantry from their reinforcements on each planet they control."
 *
 * A directive (7.7, 7.8): it is resolved once and leaves nothing in play. Both outcomes change what the plan
 * counts, the infantry on the planets of each player and their trade goods, so it is to become a `play` of the agenda
 * entry that resolves it, with the outcome chosen there (`choices.outcome`). Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:plowshares';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Each player is every state the replay has: the owner's, mine and the opponents' it keeps.
  play: ({ choices, states, shared }) => {
    const everyone = new Set([...Object.values(states), shared, ...Object.values(shared.rivals ?? {})]);
    for (const who of everyone) {
      if (choices.outcome === 'for') {
        let destroyed = 0;
        for (const units of Object.values(who.ground)) {
          const half = Math.ceil((units.infantry ?? 0) / 2);
          if (half > 0) units.infantry = (units.infantry ?? 0) - half;
          destroyed += half;
        }
        who.tradeGoods += destroyed;
      } else if (choices.outcome === 'against') {
        for (const [planetId, side] of Object.entries(who.control)) {
          if (side === 'me') who.ground[planetId] = { ...who.ground[planetId], infantry: (who.ground[planetId]?.infantry ?? 0) + 1 };
        }
      }
    }
  },
};
