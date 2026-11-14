/**
 * Mining Initiative (action card, Action): "Gain trade goods equal to the resource value of 1 planet you control."
 *
 * Pass 2 makes it a `play` with the choice `planet`: trade goods equal to the resources of one planet the player
 * controls; the planet is not exhausted (tirules2 ruling 2). A planet not controlled cannot be chosen:
 * `componentUnresolved` (2.6.1). Written in pass 2.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { unresolvedBy } from '../../helpers/cardPlay';

export const id = 'actionCard:mining_initiative';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    if (ctx.choices.planet === undefined) return [];
    const planetId = String(ctx.choices.planet);
    if (ctx.board.planets[planetId]?.owner !== ctx.holder) { unresolvedBy(ctx, 'the planet must be one you control'); return []; }
    // tirules2, Mining Initiative 2: the planet is read, not exhausted.
    const resources = ctx.planetValue(planetId, 'resources');
    return resources > 0 ? [tradeGoods(ctx.holder, resources)] : [];
  },
};
