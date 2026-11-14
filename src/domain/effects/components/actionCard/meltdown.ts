/**
 * Reactor Meltdown (action card, Action): "Destroy 1 space dock in a non-home system."
 *
 * Pass 2 makes it a `play` with the choice `planet`: the space dock of another player on that planet is destroyed. A
 * dock in a home system, or the player's own dock, cannot be chosen (tirules2 rulings 1 and 3): `componentUnresolved`
 * (2.6.1). Written in pass 2.
 */
import { structures } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { unresolvedBy } from '../../helpers/cardPlay';

export const id = 'actionCard:meltdown';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    if (ctx.choices.planet === undefined) return [];
    const planetId = String(ctx.choices.planet);
    const slot = ctx.systemOf(planetId);
    // tirules2, Reactor Meltdown 3: a dock in a home system cannot be targeted.
    if (slot !== undefined && ctx.tileKind(slot) === 'home') { unresolvedBy(ctx, 'the system is a home system'); return []; }
    const here = ctx.board.planets[planetId];
    const dock = (here?.structures.spacedock ?? 0) > 0;
    // tirules2, Reactor Meltdown 1: not your own dock.
    if (dock && here?.owner === ctx.holder) { unresolvedBy(ctx, 'the space dock is your own'); return []; }
    if (!dock || here?.owner === undefined) { unresolvedBy(ctx, 'no other player has a space dock on that planet'); return []; }
    return [structures.remove(here.owner, planetId, { spacedock: 1 })];
  },
};
