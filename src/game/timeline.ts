/**
 * The plan in time: a fold of `resolveTurn` and `apply` over the turns of its rounds, in the order the rules play them
 * (phases, then the plan's list; Warfare's free action is inside its card). Every turn leaves a frame, the board before
 * and after it with the events, the violations and the hints of its steps, so a question about any point of the plan is a
 * lookup. A plan that changed is replayed from its first changed round; the rounds before it keep their frames. The board
 * flows from turn to turn; nothing is rebuilt from an old state.
 */
import { isTurn } from '../domain/replay/round';
import type { ComponentDef, DataPack, Warning } from '../domain/types';
import type { Turn } from './actions';
import type { GameEvent } from './events';
import { legacyEntry } from './entry';
import { resolveTurn, type StepResult } from './resolve';
import { newTrack } from './resolve/track';
import { roundClear, roundStarted, statusEnd, statusStart, turnStart, type Round } from './round';
import { initialBoard } from './setup';
import type { Board, Table } from './types';

export type Filter = 'now' | 'forecast';

/** One turn in the timeline; the boards are never changed afterwards. */
export interface Frame {
  turnId: string;
  before: Board;
  /** The same board as `before` for a turn the timeline passed over. */
  after: Board;
  /** False for a cancelled turn, and in "now" for one not done: it changed nothing and has no violations. */
  applied: boolean;
  /** What happened right before the turn: the round or the phase began, the turn started. */
  moments: GameEvent[];
  /** The steps of the turn, with their events, violations and hints. */
  steps: StepResult[];
  violations: Warning[];
  hints: ComponentDef[];
}

interface Mark { round: Round; start: Board; to: number; statusDone: boolean }

export interface Timeline {
  table: Table;
  pack: DataPack;
  filter: Filter;
  start: Board;
  rounds: Round[];
  frames: Frame[];
  byTurn: Map<string, Frame>;
  end: Board;
  marks: Mark[];
}

export interface TimelineOptions {
  /** The board the plan begins from; the setup of the table when absent. */
  start?: Board;
  /** A timeline of the same table, filter, pack and start: the leading rounds that are the same objects keep their frames. */
  previous?: Timeline;
}

export function timeline(table: Table, pack: DataPack, rounds: Round[], filter: Filter, options: TimelineOptions = {}): Timeline {
  const { previous } = options;
  const start = options.start ?? (previous && previous.table === table ? previous.start : initialBoard(table, pack));
  let kept = 0;
  if (previous && previous.filter === filter && previous.pack === pack && previous.table === table && previous.start === start) {
    while (kept < rounds.length && kept < previous.marks.length && previous.marks[kept].round === rounds[kept]) kept += 1;
    if (kept === rounds.length && kept === previous.marks.length) return previous;
  }
  const reuse = previous && kept > 0 ? previous : undefined;
  const marks: Mark[] = reuse ? reuse.marks.slice(0, kept) : [];
  const frames: Frame[] = reuse ? reuse.frames.slice(0, marks[kept - 1].to) : [];
  let board: Board = reuse ? (kept < reuse.marks.length ? reuse.marks[kept].start : reuse.end) : start;
  let cardsDue = reuse !== undefined && !marks[kept - 1].statusDone;
  for (const round of rounds.slice(kept)) {
    const mark: Mark = { round, start: board, to: 0, statusDone: false };
    board = roundClear(table, board, pack, cardsDue).board;
    let track = newTrack({ [table.viewer]: round.held });
    let roundBegun = false;
    let statusBegun = false;
    let statusDone = false;
    /** What the moments of the round made, for the next turn that is replayed. */
    const lead: Warning[] = [];
    let moments: GameEvent[] = [];
    const take = (m: { board: Board; events: GameEvent[]; violations: Warning[] }): void => {
      board = m.board;
      moments.push(...m.events);
      lead.push(...m.violations);
    };
    const beginStatus = (turn?: Turn): void => {
      if (statusBegun) return;
      statusBegun = true;
      take(statusStart(table, board, pack, turn));
    };
    const finishStatus = (): void => {
      if (statusDone) return;
      beginStatus();
      take(statusEnd(table, board, pack));
      statusDone = true;
    };
    for (const turn of round.turns) {
      const phase = turn.phase ?? 'action';
      const skipped = turn.status === 'cancelled' || (filter === 'now' && turn.status !== 'done');
      if (skipped) {
        frames.push({ turnId: turn.id, before: board, after: board, applied: false, moments: [], steps: [], violations: [], hints: [] });
        continue;
      }
      moments = [];
      if (phase === 'agenda') finishStatus();
      if (!roundBegun) {
        roundBegun = true;
        take(roundStarted(table, board, pack));
      }
      if (phase === 'status') beginStatus(turn);
      if (phase === 'action' && isTurn(legacyEntry(table, turn), pack)) take(turnStart(table, board, pack, turn));
      const before = board;
      // The status phase ends with its status entry (81.4, 81.6), and what its end brings is part of that turn.
      const closing = turn.action.kind === 'status' ? (b: Board) => { board = b; finishStatus(); return { board, violations: lead.splice(0) }; } : undefined;
      const resolution = resolveTurn(table, board, turn, pack, { track, moments: lead.splice(0), ...(closing ? { closing } : {}) });
      board = resolution.board;
      track = resolution.track;
      const violations = resolution.steps.flatMap(s => s.violations);
      const after = board;
      frames.push({
        turnId: turn.id, before, after, applied: true, moments, steps: resolution.steps, violations,
        hints: resolution.steps.flatMap(s => s.hints),
      });
    }
    mark.to = frames.length;
    mark.statusDone = statusDone;
    cardsDue = !statusDone;
    marks.push(mark);
  }
  return { table, pack, filter, start, rounds, frames, byTurn: new Map(frames.map(f => [f.turnId, f])), end: board, marks };
}

/** The violations of every replayed turn, by turn id. */
export const violationsOf = (line: Timeline): Record<string, Warning[]> =>
  Object.fromEntries(line.frames.filter(f => f.applied).map(f => [f.turnId, f.violations]));
