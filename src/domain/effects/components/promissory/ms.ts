/**
 * Military Support (Federation of Sol, promissory note): "At the start of the Sol player's turn: Remove 1 token from
 * the Sol player's strategy pool, if able, and return it to their reinforcements. Then, you may place 2 infantry from
 * your reinforcements on any planet you control. Then, return this card to the Sol player."
 *
 * Pass 1: a hint. Decided: `play`. The holder plays it as a component entry (choices.planet): 2 infantry from reinforcements
 * on that planet, which must be theirs; the Sol player loses 1 token of the strategy pool, if able. The card goes back to
 * the Sol player by the generic rule of notes that return (69.3). The timing (the start of the Sol player's turn) is not checked.
 */
import { noteAddress } from '../../../components';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { violation } from '../../../rules/registry';
import { placeUnits, tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:ms';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    // "Remove 1 token from the Sol player's strategy pool, if able": an empty pool loses nothing.
    const key = noteAddress(ctx.id);
    const sol = key === undefined ? undefined : ctx.playerOf(key);
    const events: GameEvent[] = sol !== undefined && ctx.of(sol).pools.strategy > 0 ? [tokens(sol, { strategy: -1 })] : [];
    const planet = ctx.choices.planet;
    if (typeof planet !== 'string') return events;
    if (ctx.board.planets[planet]?.owner !== ctx.holder) ctx.warn(violation(placeNotControlled.code, { planetId: planet }));
    return [...events, placeUnits(ctx.holder, { planet }, { infantry: 2 })];
  },
};
