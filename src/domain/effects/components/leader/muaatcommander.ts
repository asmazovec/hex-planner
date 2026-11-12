/**
 * Magmus (Embers of Muaat, commander): "After you spend a token from your strategy pool: You may gain 1 trade good."
 *
 * Decided: `passive`. While the commander is unlocked, every token the Muaat spends from the strategy pool (a
 * secondary ability, Star Forge, a technology's cost) gives one trade good after it is spent (Muaat note 1); a
 * secondary that costs no token gives none. Gaining a trade good is never a loss, so "may" is taken as used. It needs
 * a point of the count asked where a strategy token is spent. Built on the hook `onTokenSpent` (points/moments.ts), asked where a strategy card or a component spends a token.
 */
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'leader:muaatcommander';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // Only while unlocked: a locked leader has no ability (51.1).
  onTokenSpent: turn => {
    if (turn.state.holdings.leaders[id] === 'unlocked') turn.state.tradeGoods += turn.count;
  },
};
