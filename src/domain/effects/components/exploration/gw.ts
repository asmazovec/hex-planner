/**
 * Gamma Wormhole (frontier exploration, Prophecy of Kings): "Place a gamma wormhole token in this system. Then, purge
 * this card."
 *
 * Decided: `play`, named in the `uses` of the tactical action that explores the system: a gamma wormhole token stands in
 * the active system for the rest of the game, and from then on movement takes it as adjacent to every other system with
 * a gamma wormhole (101, "Systems that contain identical wormholes are adjacent"). Pass 2: written.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:gw';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (entry?.type !== 'tactical' || entry.systemId === null) return [];
    const to = entry.systemId;
    const from = Object.keys(ctx.board.common.wormholeTokens).find(key => ctx.board.common.wormholeTokens[key].includes('gamma'));
    if (from === to) return [];
    return [from === undefined ? { type: 'WormholeTokenPlaced', system: to, wormhole: 'gamma' } : { type: 'WormholeTokenMoved', from, to, wormhole: 'gamma' }];
  },
};
