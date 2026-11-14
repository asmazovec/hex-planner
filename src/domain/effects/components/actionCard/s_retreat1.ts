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
import { commandToken } from '../../../../game/abilities/emit';
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import { othersHaveShips, placeIn, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:s_retreat1';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'from', kind: 'system' },
    { key: 'to', kind: 'system' },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.from === undefined || ctx.choices.to === undefined) return [];
    const from = String(ctx.choices.from);
    const to = String(ctx.choices.to);
    if (!ctx.adjacent(from).includes(to) || othersHaveShips(ctx, to)) unmetBy(ctx);
    const moved = { ...ctx.my.unitsIn(from) };
    const events: GameEvent[] = Object.keys(moved).length > 0 ? [{ type: 'UnitsRemoved', player: ctx.holder, at: { slot: from }, units: moved }] : [];
    placeIn(ctx, events, to, moved);
    if (!ctx.board.systems[to]?.tokens.includes(ctx.holder)) events.push(commandToken.place(ctx.holder, to));
    return events;
  },
};
