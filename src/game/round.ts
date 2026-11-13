/**
 * The structure of a round: its phases in order, and the moments the components are told of (the round starts, the status
 * phase starts and ends, a turn of the action phase starts), as events with causes. A moment is asked of the components of
 * every player, each for their own (the old replay asked only the viewer's for the round and status starts). The checks of
 * the round's flow (a turn out of its phase, after a pass, a pass before the primaries) are `resolve/flow.ts`, over the
 * turns of the round the track holds.
 */
import { fire, type MomentHook } from '../domain/effects/points/moments';
import { readyCards } from '../domain/replay/holdings';
import { clearBoard } from '../domain/replay/status';
import type { DataPack, Entry, Phase, Warning } from '../domain/types';
import type { Turn } from './actions';
import { applyAll } from './apply';
import type { GameEvent } from './events';
import { legacyEntry } from './fromLegacy';
import { legacyEvents, legacyViews, legacyViewsFresh, viewFor } from './legacyViews';
import type { Board, PlayerId, Table } from './types';

/** The phases of a round in the order they are played, whatever the order of the plan's list. */
export const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

/** A round of a plan: its strategy cards (the viewer's) and its turns in the order of the plan's list. */
export interface Round { number: number; strategyCard: number | null; backupCard: number | null; /** The strategy cards the viewer holds this round. */ held: number[]; turns: Turn[] }

export interface Moment { board: Board; events: GameEvent[]; violations: Warning[] }

const noMoment = (board: Board): Moment => ({ board, events: [], violations: [] });

/** Asks the components of `players` for the hook, and applies what they changed. `turn` is the turn the moment belongs to, when there is one. */
function ask(table: Table, board: Board, pack: DataPack, hook: MomentHook, players: PlayerId[], turn?: Turn, entry?: Entry): Moment {
  const before = legacyViews(table, board, pack);
  const work = legacyViewsFresh(table, board, pack);
  const violations: Warning[] = [];
  let ran = 0;
  for (const player of players) {
    const v = viewFor(table, board, pack, player, work);
    ran += fire(hook, { game: v.game, state: v.state, shared: v.shared, pack, warnings: violations, player: v.key, states: work.states, ...(entry ? { entry } : {}) }, {});
  }
  if (ran === 0) return { board, events: [], violations };
  const events = legacyEvents(table, pack, before, work, table.viewer, { ...(turn ? { turn: turn.id } : {}), step: 'round' });
  return { board: applyAll(board, events), events, violations };
}

const everyone = (table: Table): PlayerId[] => table.players.map(p => p.id);

/** The round begins with the board clear and its planets ready (81.4, 81.6: the agenda phase has ended); cards are readied too when the status phase before it was not replayed. */
export function roundClear(table: Table, board: Board, pack: DataPack, cardsDue: boolean): Moment {
  const work = legacyViewsFresh(table, board, pack);
  const before = legacyViews(table, board, pack);
  const states = Object.values(work.states);
  if (cardsDue) readyCards(states);
  clearBoard(states);
  const events = legacyEvents(table, pack, before, work, table.viewer, { step: 'round' });
  return { board: applyAll(board, events), events, violations: [] };
}

/** The components are told the round has started. */
export const roundStarted = (table: Table, board: Board, pack: DataPack): Moment => ask(table, board, pack, 'onRoundStart', everyone(table));

/** The status phase begins, once: the components are told, with the first entry of the phase when it names what takes the place of the start's effect. */
export const statusStart = (table: Table, board: Board, pack: DataPack, turn?: Turn): Moment =>
  ask(table, board, pack, 'onStatusStart', everyone(table), turn, turn ? legacyEntry(table, turn) : undefined);

/** The status phase ends, once: the board is cleared, the cards readied, and every player's components are told. */
export function statusEnd(table: Table, board: Board, pack: DataPack): Moment {
  const work = legacyViewsFresh(table, board, pack);
  const before = legacyViews(table, board, pack);
  clearBoard(Object.values(work.states));
  readyCards(Object.values(work.states));
  const events = legacyEvents(table, pack, before, work, table.viewer, { step: 'round' });
  const cleared = applyAll(board, events);
  const asked = ask(table, cleared, pack, 'onStatusEnd', everyone(table));
  return { board: asked.board, events: [...events, ...asked.events], violations: asked.violations };
}

/** A turn of the action phase begins: its player's components are told. */
export const turnStart = (table: Table, board: Board, pack: DataPack, turn: Turn): Moment =>
  ask(table, board, pack, 'onTurnStart', [turn.player], turn, legacyEntry(table, turn));

export { noMoment };
