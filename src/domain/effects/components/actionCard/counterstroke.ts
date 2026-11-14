/**
 * Counterstroke (action card, After another player activates a system that contains 1 of your command tokens):
 * "Return that command token to your tactic pool."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `systemId`:
 * my command token leaves that system for my tactic pool. A system without my token is warned of.
 */
import { commandToken, tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:counterstroke';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.systemId === undefined) return [];
    const slot = String(ctx.choices.systemId);
    if (!ctx.board.systems[slot]?.tokens.includes(ctx.holder)) { unmetBy(ctx); return []; }
    return [tokens(ctx.holder, { tactic: 1 }), commandToken.remove(ctx.holder, slot)];
  },
};
