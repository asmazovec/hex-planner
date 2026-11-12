/**
 * Skilled Retreat (action card, At the start of a combat round): "Move all of your ships from the active system into
 * an adjacent system that does not contain another player's ships. The space combat ends in a draw. Then, place a
 * command token from your reinforcements in that system."
 *
 * A `play` in a window of a combat (an entry of the component kind that is not a turn) with the choices `from` and
 * `to`: all my ships of the active system move into the adjacent system and my command token from the reinforcements
 * is placed there (the pools do not change). The card's own condition (adjacent, no other player's ships) is warned of
 * when it is not met; the fleet pool and capacity of the system I retreat into are checked as for any arrival.
 */
import type { ComponentEffect } from '../../types';
import { adjacentSlots, othersShipsIn, place, removeFrom, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:s_retreat1';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'from', kind: 'system' },
    { key: 'to', kind: 'system' },
  ],
  play: turn => {
    if (turn.choices.from === undefined || turn.choices.to === undefined) return;
    const from = String(turn.choices.from);
    const to = String(turn.choices.to);
    if (!adjacentSlots(turn, from).includes(to) || othersShipsIn(turn, to)) unmet(turn);
    const moved = removeFrom(turn.state, from, { ...turn.state.systems[from] });
    place(turn, to, moved);
    if (!turn.state.tokensOnMap.includes(to)) turn.state.tokensOnMap.push(to);
  },
};
