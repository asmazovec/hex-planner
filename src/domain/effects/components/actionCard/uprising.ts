/**
 * Uprising (action card, Action): "Exhaust 1 non-home planet controlled by another player. Then gain trade goods
 * equal to its resource value."
 *
 * A `play` of a component action with the choice `planetId`: the other player's planet is exhausted and I gain trade
 * goods equal to its resources. A home planet, a planet of mine or an exhausted one is warned of; a planet of mine
 * changes nothing, the others are counted as entered.
 */
import { planet, tradeGoods } from '../../../../game/abilities/emit';
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import { unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:uprising';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.planetId === undefined) return [];
    const planetId = String(ctx.choices.planetId);
    const held = ctx.board.planets[planetId];
    const owner = held?.owner !== undefined && held.owner !== ctx.holder ? held.owner : undefined;
    const home = Object.values(ctx.pack.tiles).some(tile => tile.kind === 'home' && tile.planetIds.includes(planetId));
    if (owner === undefined || home || held?.exhausted) unmetBy(ctx);
    if (owner === undefined) return [];
    const events: GameEvent[] = held?.exhausted ? [] : [planet.exhaust(owner, planetId)];
    const resources = ctx.pack.planets[planetId]?.resources ?? 0;
    if (resources > 0) events.push(tradeGoods(ctx.holder, resources));
    return events;
  },
};
