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
import type { Board, PlayerId, Table } from '../game/types';
import type { DataPack, Warning } from '../domain/types';
import { checkSystemOf } from '../domain/replay/transport';
import { newTurn } from '../game/edit/new';
import { withTurnAdded } from '../game/edit/plan';
import { emptyRound } from '../game/round';
import { asker, causes, optionsAt, slotOfCandidate, type Candidate, type ChoicePoint, type Option, type Point } from '../game/options';

export type { Candidate, ChoicePoint, Option, Point };
export { asker, causes, optionsAt, slotOfCandidate };

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
 * Those of `first`, the player the screen shows, come first; the others follow by seat.
 */
export function systemWarningsAt(line: Timeline, roundNo: number, slot: string, first: PlayerId): Warning[] {
  const { table, pack } = line;
  const board = boardAt(line, roundNo);
  const bySeat = [...table.players].sort((x, y) => x.seat - y.seat);
  const ordered = [...bySeat.filter(p => p.id === first), ...bySeat.filter(p => p.id !== first)];
  return ordered.flatMap(({ id }) => waiveBoard(table, board, pack, id, checkSystemOf(stacksOn(table, board, pack, id), slot)));
}

// ---------------------------------------------------------------------------------------------------------------------
// The options of a turn: what an edit of it would cause (src/game/options.ts).

const points = new WeakMap<Timeline, WeakMap<Turn, { plain?: Point; manual?: Point }>>();

/**
 * A turn of the plan at its place: the board just before it, the round and what the round remembered, so that a candidate
 * edit is resolved as the replay resolves the turn. Warfare's free action is resolved inside its card. The same object
 * for the same turn of the same timeline, so what was asked of it is kept; `manual` says the payment is the player's own.
 * None for a turn the timeline does not hold.
 */
export function pointOf(line: Timeline, turn: Turn, manual = false): Point | undefined {
  let byTurn = points.get(line);
  if (!byTurn) points.set(line, byTurn = new WeakMap());
  let kept = byTurn.get(turn);
  if (!kept) byTurn.set(turn, kept = {});
  const slot = manual ? 'manual' : 'plain';
  if (kept[slot]) return kept[slot];
  const { table, pack } = line;
  const frame = line.byTurn.get(turn.id);
  let point: Point | undefined;
  if (frame) {
    const round = line.rounds.find(r => r.turns.some(t => t.id === turn.id));
    point = { table, pack, board: frame.before, turn, ...(round ? { round } : {}), track: frame.track, lead: frame.lead, manual };
  } else {
    for (const round of line.rounds) {
      const host = round.turns.find(t => t.action.kind === 'strategic' && (t.action.nested ?? []).some(n => n.id === turn.id));
      const hostFrame = host && line.byTurn.get(host.id);
      // The editors of a nested action read the board the plan ends on (`boardBefore`); its card is resolved where it stands.
      if (host && hostFrame) point = { table, pack, board: line.end, turn, host, hostBoard: hostFrame.before, round, track: hostFrame.track, lead: hostFrame.lead, manual };
    }
  }
  if (point) kept[slot] = point;
  return point;
}

const asked = new WeakMap<Point, Map<string, Option[]>>();

/** The options of a choice point, asked once for a point: a screen draws many times between two edits, and a route under way asks once for each of its steps. */
export function optionsKept(point: Point, where: ChoicePoint): Option[] {
  let kept = asked.get(point);
  if (!kept) asked.set(point, kept = new Map());
  const key = JSON.stringify(where);
  let found = kept.get(key);
  if (!found) kept.set(key, found = optionsAt(point, where));
  return found;
}

const askers = new WeakMap<Point, (candidate: Candidate) => Warning[]>();

/** What a candidate would cause at a point, each candidate asked once: for the blocks of an editor, which ask as they draw. */
export function causesKept(point: Point | undefined, candidate: Candidate): Warning[] {
  if (!point) return [];
  let ask = askers.get(point);
  if (!ask) askers.set(point, ask = asker(point));
  return ask(candidate);
}

const fresh = new WeakMap<Timeline, Map<string, Point>>();

/**
 * The point of a tactical action not in the plan yet, as it would stand once added to a round for a player (inside the
 * card `byCard` for Warfare's free action): it has no system, and nothing of it is resolved until a candidate gives one.
 * The round is replayed once with it; the rounds before keep their frames.
 */
export function pointOfNewTactical(line: Timeline, roundNo: number, player: PlayerId, byCard?: string): Point | undefined {
  let kept = fresh.get(line);
  if (!kept) fresh.set(line, kept = new Map());
  const key = `${roundNo}:${player}:${byCard ?? ''}`;
  const known = kept.get(key);
  if (known) return known;
  const round = line.rounds.find(r => r.number === roundNo) ?? emptyRound(roundNo);
  const made = newTurn('tactical', { id: 'option:new', player, round }, byCard ? { byCard } : {});
  const turn: Turn = made.action.kind === 'tactical' ? { ...made, action: { ...made.action, system: null } } : made;
  const added = withTurnAdded(round, turn, byCard);
  const rounds = line.rounds.some(r => r.number === roundNo) ? line.rounds.map(r => (r.number === roundNo ? added : r)) : [...line.rounds, added];
  const next = kernelTimeline(line.table, line.pack, rounds, line.filter, { start: line.start, previous: line });
  const placed = findNested(added, turn.id);
  const point = placed && pointOf(next, placed);
  if (point) kept.set(key, point);
  return point;
}

const findNested = (round: Round, id: string): Turn | undefined => {
  for (const turn of round.turns) {
    if (turn.id === id) return turn;
    const inner = turn.action.kind === 'strategic' ? (turn.action.nested ?? []).find(n => n.id === id) : undefined;
    if (inner) return inner;
  }
  return undefined;
};
