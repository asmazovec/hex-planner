/**
 * Diplomacy (LRR 32): the primary picks a system with a planet of mine, other than Mecatol Rex, where every other player
 * puts a token from reinforcements; both sides ready up to two of my exhausted planets, the base primary every one of
 * mine in that system.
 */
import { strategyCardSet } from '../../cards';
import type { CardEntry } from '../../strategy';
import type { ExpansionId } from '../../types';
import type { CardHandler } from './handler';

const READY_LIMIT = 2;

/** Whether the planets to ready are those of the chosen system, with no limit: only the base primary says "that system". */
export const inSystem = (entry: CardEntry, expansions: ExpansionId[]): boolean =>
  entry.type === 'strategic' && strategyCardSet(expansions) === 'base_game';

/** How many planets the entry may ready, or null for no limit. */
export const readyLimit = (entry: CardEntry, expansions: ExpansionId[]): number | null =>
  (inSystem(entry, expansions) ? null : READY_LIMIT);

export const diplomacy: CardHandler = {
};
