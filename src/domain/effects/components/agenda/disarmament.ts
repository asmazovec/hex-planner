/**
 * Compensated Disarmament (agenda, directive): "Destroy each ground force on the elected planet. For each unit that was
 * destroyed, the player who control that planet gains 1 trade good."
 *
 * Decided: play. The ground forces on the elected planet (`choices.planet`) leave the board and the controller gains a
 * trade good for each (Compensated Disarmament notes 2 and 4: infantry and mechs count, structures are unaffected).
 *
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:disarmament';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ state, choices }) => {
    const planet = String(choices.planet ?? '');
    if (planet === '') return;
    const destroyed = Object.values(state.ground[planet] ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
    delete state.ground[planet];
    // The player who controls the planet gains a trade good for each unit (note 2); a planet of another player is not my state.
    if (state.control[planet] === 'me') state.tradeGoods += destroyed;
  },
};
