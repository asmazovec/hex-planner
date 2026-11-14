/**
 * Insubordination (action card, Action): "Remove 1 token from another player's tactic pool and return it to their
 * reinforcements."
 *
 * Pass 2 makes it a `play` with the choice `player`: one token leaves that opponent's tactic pool. A player with no
 * token in the tactic pool cannot be chosen (tirules2 ruling 1): LRR 2.6.1, a component action that cannot be resolved
 * completely, is warned of with `componentUnresolved`. Pass 1 keeps it the hint it is today; its tests say what it
 * must do.
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { unresolvedBy } from '../../helpers/cardPlay';

export const id = 'actionCard:insub';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  holder: 'self',
  play: ctx => {
    if (ctx.choices.player === undefined) return [];
    const target = ctx.playerOf(String(ctx.choices.player));
    if (target === undefined || target === ctx.holder) { unresolvedBy(ctx, 'another player must be chosen'); return []; }
    // tirules2, Insubordination 1: no token in the tactic pool, no target.
    if (ctx.of(target).pools.tactic < 1) { unresolvedBy(ctx, 'that player has no command token in their tactic pool'); return []; }
    return [tokens(target, { tactic: -1 })];
  },
};
