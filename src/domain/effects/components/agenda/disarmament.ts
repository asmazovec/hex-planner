/**
 * Compensated Disarmament (agenda, directive): "Destroy each ground force on the elected planet. For each unit that was
 * destroyed, the player who control that planet gains 1 trade good."
 *
 * Decided: play. The ground forces on the elected planet (`choices.planet`) leave the board and the controller gains a
 * trade good for each (Compensated Disarmament notes 2 and 4: infantry and mechs count, structures are unaffected).
 *
 */
import { removeUnits, tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:disarmament';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planet = String(ctx.choices.planet ?? '');
    if (planet === '') return [];
    let destroyed = 0;
    const events: GameEvent[] = [];
    for (const [player, units] of Object.entries(ctx.board.planets[planet]?.ground ?? {})) {
      const count = Object.values(units).reduce((sum, each) => sum + (each ?? 0), 0);
      if (count <= 0) continue;
      destroyed += count;
      events.push(removeUnits(player, { planet }, units));
    }
    // The player who controls the planet gains a trade good for each unit (note 2).
    const controller = ctx.board.planets[planet]?.owner;
    if (controller !== undefined && destroyed > 0) events.push(tradeGoods(controller, destroyed));
    return events;
  },
};
