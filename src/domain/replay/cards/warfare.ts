/**
 * Warfare (LRR 99): before Thunder's Edge the primary lifts one of my tokens off the board and gains it, then the pools
 * are rearranged; in Thunder's Edge it starts a free tactical action. The secondary produces at home.
 */
import type { CardEntry } from '../../strategy';
import type { ExpansionId, GameState } from '../../types';
import type { CardHandler } from './handler';

/** Before Thunder's Edge, whether the primary lifts a token: the chosen system holds one of mine. Without the board, it may. */
const lifts = (entry: CardEntry, expansions: ExpansionId[], before?: GameState): boolean => {
  if (entry.type !== 'strategic' || expansions.includes('te')) return false;
  if (!before) return true;
  const systemId = entry.effects?.systemId;
  return systemId !== undefined && before.tokensOnMap.includes(systemId);
};

export const warfare: CardHandler = {
  freeTokens: (entry, expansions, before) => (lifts(entry, expansions, before) ? 1 : 0),
  apply: ({ game, state, entry, primary }) => {
    const systemId = entry.effects?.systemId;
    if (primary && systemId && !game.expansions.includes('te')) state.tokensOnMap = state.tokensOnMap.filter(id => id !== systemId);
  },
};
