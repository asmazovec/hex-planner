/**
 * Magmus (Embers of Muaat, commander): "After you spend a token from your strategy pool: You may gain 1 trade good."
 *
 * Decided: `passive`. While the commander is unlocked, every token the Muaat spends from the strategy pool (a
 * secondary ability, Star Forge, a technology's cost) gives one trade good after it is spent (Muaat note 1); a
 * secondary that costs no token gives none. Gaining a trade good is never a loss, so "may" is taken as used. It needs
 * a point of the count asked where a strategy token is spent. Built on the hook `onTokenSpent` (points/moments.ts), asked where a strategy card or a component spends a token.
 */
import { gain } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:muaatcommander';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'self',
  on: {
    // Only while unlocked: a locked leader has no ability (51.1).
    onTokenSpent: (ctx, spent) => {
      const state = ctx.my.card(id);
      if (state !== undefined && state !== 'locked' && state !== 'exhausted') return [gain.tradeGoods(ctx.holder, spent.count)];
    },
  },
};
