/**
 * Unexpected Action (action card, Action): "Remove 1 of your command tokens from the game board and return it to your
 * reinforcements."
 *
 * A `play` of a component action with the choice `systemId`: my command token leaves that system for my reinforcements
 * (not for a pool). A system without my token is warned of.
 */
import { commandToken } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:unexpected';

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
    return [commandToken.remove(ctx.holder, slot)];
  },
};
