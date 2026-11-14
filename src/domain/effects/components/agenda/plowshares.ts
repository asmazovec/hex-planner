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
import { placeUnits, removeUnits, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';

export const id = 'agenda:plowshares';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // Each player is every player of the table.
  play: ctx => {
    const events: GameEvent[] = [];
    for (const { id: player } of ctx.table.players) {
      const who = ctx.of(player);
      if (ctx.choices.outcome === 'for') {
        let destroyed = 0;
        for (const planetId of Object.keys(ctx.board.planets)) {
          const half = Math.ceil((who.unitsOn(planetId).infantry ?? 0) / 2);
          if (half > 0) events.push(removeUnits(player, { planet: planetId }, { infantry: half }));
          destroyed += half;
        }
        if (destroyed > 0) events.push(tradeGoods(player, destroyed));
      } else if (ctx.choices.outcome === 'against') {
        for (const planet of who.planets()) events.push(placeUnits(player, { planet: planet.id }, { infantry: 1 }));
      }
    }
    return events;
  },
};
