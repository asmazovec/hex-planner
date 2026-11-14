/** The round (LRR 40): its phases in order, and the entries that only mark the flow of the round. */
import { componentById } from '../components';
import { violation } from '../rules/registry';
import { heldCards } from '../strategy';
import type { DataPack, Entry, Game, Round, Warning } from '../types';

/** What a round remembers of its flow: whose pass has been replayed, by owner ('' for me). */
export interface RoundFlow { round: Round; passed: Set<string> }

/** An action card played in a window of its own ("After ...", "When ..."): not a component action, so no turn (2.6, 40.2). */
const inWindow = (pack: DataPack | undefined, id: string): boolean => {
  const def = pack ? componentById(pack, id) : undefined;
  return def?.kind === 'agenda' || (def?.kind === 'actionCard' && def.detail?.window !== 'Action');
};

/** An action card headed "Action" is a component action (2.6.1): named by a secondary, the secondary is a turn of the action phase. */
const actsAsAction = (pack: DataPack | undefined, id: string): boolean => {
  const def = pack ? componentById(pack, id) : undefined;
  return def?.kind === 'actionCard' && def.detail?.window === 'Action';
};

/**
 * The entries that are a turn of the action phase (LRR 3.1): a pass ends the player's turns. A component entry for a
 * card played in a window of its own is no turn (2.6); a secondary that plays an "Action" card (Strategize) is one.
 */
export const isTurn = (entry: Entry, pack?: DataPack): boolean => {
  if (entry.type === 'component') return entry.componentId === undefined || !inWindow(pack, entry.componentId);
  if (entry.type === 'secondary') return [...(entry.spends ?? []), ...(entry.uses ?? [])].some(id => actsAsAction(pack, id));
  return entry.type === 'tactical' || entry.type === 'strategic' || entry.type === 'pass';
};

/**
 * Check of the round's flow before an entry applies, and the pass it records: a turn outside the action phase (40.2), a
 * turn after the player passed (3.3; secondaries stay allowed, 3.3.2), a pass before the primary of each card the player
 * holds (3.4, 82.2). A rival's cards are not planned, so only my passes are checked against cards. `primaries` holds the
 * cards whose primary has been played this round.
 */
export function checkFlow(game: Game, entry: Entry, flow: RoundFlow, primaries: (number | undefined)[], pack?: DataPack): Warning[] {
  if (!isTurn(entry, pack)) return [];
  if (entry.phase !== 'action') return [violation('actionOutsidePhase', {})];
  const owner = entry.owner ?? '';
  if (flow.passed.has(owner)) return entry.type === 'pass' ? [] : [violation('actionAfterPass', {})];
  if (entry.type !== 'pass') return [];
  flow.passed.add(owner);
  if (entry.owner) return [];
  const unplayed = heldCards(flow.round, game.playerCount).filter(card => !primaries.includes(card));
  return unplayed.length > 0 ? [violation('passBeforeStrategy', { cards: unplayed.length })] : [];
}
