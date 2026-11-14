/**
 * The structure of a round: its phases in order, and the moments the components are told of (the round starts, the status
 * phase starts and ends, a turn of the action phase starts), as events with causes. A moment is asked of the components of
 * every player, each for their own (the old replay asked only the viewer's for the round and status starts). The checks of
 * the round's flow (a turn out of its phase, after a pass, a pass before the primaries) are `resolve/flow.ts`, over the
 * turns of the round the track holds.
 */
import type { DataPack, Entry, Phase, Warning } from '../domain/types';
import type { Turn } from './actions';
import { applyAll } from './apply';
import type { GameEvent } from './events';
import { legacyEntry } from './entry';
import { runHooks } from './resolve/hooks';
import type { HookKind } from './abilities/types';
import type { Board, PlayerId, Table } from './types';

/** The phases of a round in the order they are played, whatever the order of the plan's list. */
export const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

/** A round of a plan: its strategy cards (the viewer's) and its turns in the order of the plan's list. */
export interface Round { number: number; strategyCard: number | null; backupCard: number | null; /** The strategy cards the viewer holds this round. */ held: number[]; turns: Turn[] }

export interface Moment { board: Board; events: GameEvent[]; violations: Warning[] }

const noMoment = (board: Board): Moment => ({ board, events: [], violations: [] });

/** Asks the components of `players` for the hook, and applies what they returned. `turn` is the turn the moment belongs to, when there is one. */
function ask(table: Table, board: Board, pack: DataPack, hook: HookKind, players: PlayerId[], turn?: Turn, entry?: Entry): Moment {
  return runHooks(table, board, pack, hook, players, {}, { actor: turn?.player ?? table.viewer, step: 'round', ...(turn ? { turn: turn.id } : {}), ...(entry ? { entry } : {}) });
}

const everyone = (table: Table): PlayerId[] => table.players.map(p => p.id);

/** The events that clear the board: every planet readied, every command token off the map, and with `cards` every exhausted card readied (a leader and a breakthrough come back ready too). */
function clearing(table: Table, board: Board, cards: boolean): GameEvent[] {
  const cause = { step: 'round' as const };
  const events: GameEvent[] = [];
  for (const [planet, state] of Object.entries(board.planets)) {
    if (state.exhausted && state.owner !== undefined) events.push({ type: 'PlanetReadied', player: state.owner, planet, cause });
  }
  for (const { id } of table.players) {
    if (Object.values(board.systems).some(s => s.tokens.includes(id))) events.push({ type: 'TokenReturned', player: id, cause });
    if (!cards) continue;
    for (const [card, hold] of Object.entries(board.players[id]?.cards ?? {})) {
      if (hold.state === 'exhausted') events.push({ type: 'CardReadied', player: id, card, cause });
    }
  }
  return events;
}

/** The round begins with the board clear and its planets ready (81.4, 81.6: the agenda phase has ended); cards are readied too when the status phase before it was not replayed. */
export function roundClear(table: Table, board: Board, _pack: DataPack, cardsDue: boolean): Moment {
  const events = clearing(table, board, cardsDue);
  return { board: applyAll(board, events), events, violations: [] };
}

/** The components are told the round has started. */
export const roundStarted = (table: Table, board: Board, pack: DataPack): Moment => ask(table, board, pack, 'onRoundStart', everyone(table));

/** The status phase begins, once: the components are told, with the first entry of the phase when it names what takes the place of the start's effect. */
export const statusStart = (table: Table, board: Board, pack: DataPack, turn?: Turn): Moment =>
  ask(table, board, pack, 'onStatusStart', everyone(table), turn, turn ? legacyEntry(table, turn) : undefined);

/** The status phase ends, once: the board is cleared, the cards readied, and every player's components are told. */
export function statusEnd(table: Table, board: Board, pack: DataPack): Moment {
  const events = clearing(table, board, true);
  const cleared = applyAll(board, events);
  const asked = ask(table, cleared, pack, 'onStatusEnd', everyone(table));
  return { board: asked.board, events: [...events, ...asked.events], violations: asked.violations };
}

/** A turn of the action phase begins: its player's components are told. */
export const turnStart = (table: Table, board: Board, pack: DataPack, turn: Turn): Moment =>
  ask(table, board, pack, 'onTurnStart', [turn.player], turn, legacyEntry(table, turn));

export { noMoment };
