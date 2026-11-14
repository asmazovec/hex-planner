/**
 * Orbital Drop (Federation of Sol, ability): "ACTION: Spend 1 token from your strategy pool to place 2 infantry from
 * your reinforcements on 1 planet you control."
 *
 * Pass 1: a hint. Decided: `play`. A component action naming the ability (choices.planet): 1 token from the strategy pool
 * (the pool going below zero is warned of), 2 infantry from reinforcements on that planet, which must be one the player controls.
 */
import { placeUnits, tokens } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { violation } from '../../../rules/registry';

export const id = 'ability:orbital_drop';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    // The ability is printed on the Federation of Sol's sheet only: another faction naming it places nothing.
    if (ctx.my.faction !== 'sol') return [];
    const left = ctx.my.pools.strategy - 1;
    if (left < 0) ctx.warn(violation('poolNegative', { pool: 'strategy', have: left }));
    const events = [tokens(ctx.holder, { strategy: -1 })];
    const planet = ctx.choices.planet;
    if (typeof planet !== 'string') return events;
    if (ctx.board.planets[planet]?.owner !== ctx.holder) ctx.warn(violation(placeNotControlled.code, { planetId: planet }));
    return [...events, placeUnits(ctx.holder, { planet }, { infantry: 2 })];
  },
};
