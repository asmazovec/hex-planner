/**
 * The one entry of the app into the calculation of a game: the plan of the saved game replayed by the game kernel
 * (src/game/timeline.ts), kept between renders, one timeline for each plan and filter, replayed from the round that
 * changed. The screens ask here and never replay a plan themselves. The frames are the kernel's own: the boards before
 * and after each turn, its events, violations by step and hints. It rests on the store keeping every object it did not edit.
 */
import type { Turn } from '../game/actions';
import { choicesOf, type ResolvedChoice } from '../game/abilities/choices';
import { stacksOn } from '../game/queries';
import { statusOf, turnNumbers } from '../game/numbering';
import type { Round } from '../game/round';
import { warningsByTurn } from '../game/rowWarnings';
import type { SavedGame } from '../game/save';
import { startBoard } from '../game/setup';
import { STARTS } from '../game/source';
import { timeline as kernelTimeline, violationsOf, type Filter, type Timeline } from '../game/timeline';
import { waiveBoard } from '../game/resolve/waive';
import type { Board, Table } from '../game/types';
import type { DataPack, Warning } from '../domain/types';
import { checkSystemOf } from '../domain/replay/transport';

export type { Filter, Timeline };
export { warningsByTurn, violationsOf };

/** The table of a saved game and the board its plans begin from: the objects the timelines of the game stand on. */
interface Setup { saved: SavedGame; pack: DataPack; table: Table; start: Board }
let setup: Setup | undefined;

/** The table and the starting board of a saved game, kept for as long as its table and hand-placed start are the same objects. */
export function startOfSaved(saved: SavedGame, pack: DataPack): { table: Table; start: Board } {
  if (!(setup && setup.pack === pack && setup.saved.table === saved.table && setup.saved.start === saved.start)) {
    // A table of its own for each setup: what the map source memoises by table follows the start edits.
    const table: Table = { ...saved.table };
    STARTS.set(table, saved.start);
    setup = { saved, pack, table, start: startBoard(saved, pack) };
  }
  return { table: setup.table, start: setup.start };
}

export const tableOfSaved = (saved: SavedGame, pack: DataPack): Table => startOfSaved(saved, pack).table;

let savedId: string | null = null;
const lines = new Map<string, Timeline>();

/** The timeline of a plan of the saved game; the same objects while nothing it reads changed. */
export function timelineOf(saved: SavedGame, planId: string, filter: Filter, pack: DataPack): Timeline {
  if (saved.id !== savedId) {
    lines.clear();
    savedId = saved.id;
  }
  const key = `${filter}:${planId}`;
  const { table, start } = startOfSaved(saved, pack);
  const rounds = saved.plans.find(p => p.id === planId)?.rounds ?? [];
  const line = kernelTimeline(table, pack, rounds, filter, { start, previous: lines.get(key) });
  lines.set(key, line);
  return line;
}

/** Forgets every timeline: for tests, and when a game closes. */
export function forgetTimelines(): void {
  lines.clear();
  savedId = null;
  setup = undefined;
}

/** The board as the plan stands at the end of a round: later rounds would ready planets and clear its tokens. */
export function boardAt(line: Timeline, roundNo: number): Board {
  const next = line.marks.findIndex(mark => mark.round.number > roundNo);
  return next < 0 ? line.end : line.marks[next].start;
}

/** The board just before a turn (or an action nested in a card); the end of the plan for one never reached. */
export const boardBefore = (line: Timeline, turnId: string): Board => line.byTurn.get(turnId)?.before ?? line.end;
export const boardAfter = (line: Timeline, turnId: string): Board => line.byTurn.get(turnId)?.after ?? line.end;

/** The table and the board at the end of a round: what a view of the game (`playerView`, `tableView`) is read from. */
export const viewAt = (line: Timeline, roundNo: number): { table: Table; board: Board } => ({ table: line.table, board: boardAt(line, roundNo) });

/** The turns of a round as the kernel plays them: the numbers and statuses of its actions are asked of these (src/game/numbering.ts). */
export const turnsOfRound = (round: Round): Turn[] => round.turns;

/** The number of each tactical action of a round, by turn id. */
export const tacticalNumbers = (round: Round): Record<string, number> => turnNumbers(round.turns);

/** The status of a turn as the round has it: Warfare's free action has the status of its card. */
export const statusIn = (round: Round, turnId: string) => statusOf(round.turns, turnId);

/** The choices component `id` asks of a turn, with their candidates, from the board just before the turn. */
export const choicesBefore = (line: Timeline, turn: Turn, id: string, pack: DataPack): ResolvedChoice[] =>
  choicesOf(line.table, boardBefore(line, turn.id), turn, id, pack);

/**
 * What the board itself breaks in a system at the end of a round, apart from any turn: each player's capacity and fleet
 * pool there (16.3, 37.1), as units placed by hand leave them; the passive permits in force for the player lift what they cover.
 */
export function systemWarningsAt(line: Timeline, roundNo: number, slot: string): Warning[] {
  const { table, pack } = line;
  const board = boardAt(line, roundNo);
  const ordered = [...table.players].sort((x, y) => (x.id === table.viewer ? -1 : y.id === table.viewer ? 1 : 0));
  return ordered.flatMap(({ id }) => waiveBoard(table, board, pack, id, checkSystemOf(stacksOn(table, board, pack, id), slot)));
}
