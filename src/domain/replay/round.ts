/** The round (LRR 40): its phases in order, and the entries that only mark the flow of the round. */
import { violation } from '../rules/registry';
import { heldCards } from '../strategy';
import type { Entry, Game, Phase, Round, Warning } from '../types';

/** The phases of a round in the order they are played, whatever the order of the plan's list. */
export const PHASE_ORDER: Phase[] = ['strategy', 'action', 'status', 'agenda'];

/** What a round remembers of its flow: whose pass has been replayed, by owner ('' for me). */
export interface RoundFlow { round: Round; passed: Set<string> }

export const roundFlow = (round: Round): RoundFlow => ({ round, passed: new Set() });

/** The entries that are a turn of the action phase (LRR 3.1): a pass ends the player's turns. */
const isTurn = (entry: Entry): boolean => entry.type === 'tactical' || entry.type === 'strategic' || entry.type === 'component' || entry.type === 'pass';

/**
 * Check of the round's flow before an entry applies, and the pass it records: a turn outside the action phase (40.2), a
 * turn after the player passed (3.3; secondaries stay allowed, 3.3.2), a pass before the primary of each card the player
 * holds (3.4, 82.2). A rival's cards are not planned, so only my passes are checked against cards. `primaries` holds the
 * cards whose primary has been played this round.
 */
export function checkFlow(game: Game, entry: Entry, flow: RoundFlow, primaries: (number | undefined)[]): Warning[] {
  if (!isTurn(entry)) return [];
  if (entry.phase !== 'action') return [violation('actionOutsidePhase', {})];
  const owner = entry.owner ?? '';
  if (flow.passed.has(owner)) return entry.type === 'pass' ? [] : [violation('actionAfterPass', {})];
  if (entry.type !== 'pass') return [];
  flow.passed.add(owner);
  if (entry.owner) return [];
  const unplayed = heldCards(flow.round, game.playerCount).filter(card => !primaries.includes(card));
  return unplayed.length > 0 ? [violation('passBeforeStrategy', { cards: unplayed.length })] : [];
}
