/**
 * The one entry of the app into the calculation of a game: the plan replayed by the game kernel (src/game/timeline.ts),
 * kept between renders, one timeline for each plan and filter, replayed from the round that changed. The screens ask
 * here and never replay a plan themselves. The frames of the kernel are read back in the shapes the screens use (a
 * `GameState` for each player, the warnings of each entry); a board is turned into a state only when somebody asks
 * for it, and once. It rests on the store keeping every object it did not edit.
 */
import { legacyState, tableOf } from '../game/fromLegacy';
import { startBoard } from '../game/setup';
import { stacksOn } from '../game/queries';
import { statusOf, turnNumbers } from '../game/numbering';
import { planOf } from '../game/fromLegacy';
import { timeline as kernelTimeline, type Filter, type Frame as KernelFrame, type Timeline as Kernel } from '../game/timeline';
import type { Board, Table } from '../game/types';
import type { Round as KernelRound } from '../game/round';
import { waiveBoard } from '../game/resolve/waive';
import { originOf, savedFor } from '../testing/legacySave';
import type { SavedGame } from '../game/save';
import { checkSystemOf } from '../domain/replay/transport';
import type { Turn } from '../game/actions';
import { choicesOf, type ResolvedChoice } from '../game/abilities/choices';
import { turnOf } from '../game/fromLegacy';
import type { DataPack, Entry, Game, GameState, Plan, Projection, Round, Warning } from '../domain/types';

export type { Filter };

/** One entry of the plan: the state before and after it, for me and for every opponent (`rivals`), and what it breaks. */
export interface Frame {
  entryId: string;
  before: GameState;
  /** The same state as `before` for an entry the timeline passed over. */
  after: GameState;
  /** False for a cancelled entry, and in "now" for one not done: it changed nothing and has no warnings. */
  applied: boolean;
  warnings: Warning[];
}

export interface Timeline {
  game: Game;
  plan: Plan;
  filter: Filter;
  pack: DataPack;
  /** In the order of the plan's turns; Warfare's free action right after its card. */
  frames: Frame[];
  byEntry: Map<string, Frame>;
  /** The state after the last entry. */
  readonly end: GameState;
  /** The state where each round began, by its number, and how many frames come before the round after it. */
  starts: { number: number; start: GameState; frames: number }[];
  kernel: Kernel;
}

// ---------------------------------------------------------------------------------------------------------------------
// The table and the starting board of a game, kept for as long as its setup is the same.

/** What the calculation reads of a game beside its plans. The store keeps every field it did not edit, so identity is enough. */
const OUTSIDE_SETUP = new Set(['plans', 'activePlanId', 'name']);
function sameSetup(a: Game, b: Game): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!OUTSIDE_SETUP.has(key) && (a as unknown as Record<string, unknown>)[key] !== (b as unknown as Record<string, unknown>)[key]) return false;
  }
  return true;
}

interface Setup { game: Game; saved?: SavedGame; pack: DataPack; table: Table; start: Board }
let setup: Setup | undefined;
function setupOf(game: Game, pack: DataPack): Setup {
  // A game the store holds is a view of a saved game: its table and start are the same objects until a setup edit.
  const saved = originOf(game);
  const kept = setup && setup.pack === pack && (saved && setup.saved
    ? setup.saved.table === saved.table && setup.saved.start === saved.start
    : !saved && !setup.saved && sameSetup(setup.game, game));
  if (kept) return setup!;
  setup = { game, ...(saved ? { saved } : {}), pack, table: tableOf(game), start: startBoard(saved ?? savedFor(game), pack) };
  return setup;
}

/** The rounds of the kernel for a plan: those of the saved game the store holds, else the plan read as turns. */
function roundsOf(game: Game, plan: Plan, table: Table, pack: DataPack): KernelRound[] {
  const saved = originOf(game);
  // Only the plan the view holds stands for the saved plan: a plan made of other rounds is read as turns.
  const own = saved && game.plans.find(p => p.id === plan.id) === plan ? saved.plans.find(p => p.id === plan.id) : undefined;
  return own?.rounds ?? planOf(table, plan, pack);
}

// ---------------------------------------------------------------------------------------------------------------------
// Boards read as states, once each.

const states = new WeakMap<Board, GameState>();
function stateOf(table: Table, pack: DataPack, board: Board): GameState {
  let state = states.get(board);
  if (!state) states.set(board, (state = legacyState(table, board, pack, table.viewer)));
  return state;
}

/** A frame whose states are read from their boards when first asked for. */
function frameOf(table: Table, pack: DataPack, entryId: string, applied: boolean, before: Board, after: Board, warnings: Warning[]): Frame {
  const frame = { entryId, applied, warnings } as Frame;
  Object.defineProperties(frame, {
    before: { enumerable: true, get: () => stateOf(table, pack, before) },
    after: { enumerable: true, get: () => stateOf(table, pack, after) },
  });
  return frame;
}

/** The frames of a turn: its own, and one for each action nested in it (Warfare's free one has the card's board and the warnings placed on it). */
const made = new WeakMap<KernelFrame, Frame[]>();
function framesOfTurn(table: Table, pack: DataPack, turn: Turn, k: KernelFrame): Frame[] {
  const known = made.get(k);
  if (known) return known;
  const inner = turn.action.kind === 'strategic' ? (turn.action.nested ?? []).map(n => n.id) : [];
  const placedIn = (id: string) => (w: Warning): boolean => w.place?.entryId === id;
  const own = inner.length === 0 ? k.violations : k.violations.filter(w => !inner.some(id => placedIn(id)(w)));
  const frames = [frameOf(table, pack, turn.id, k.applied, k.before, k.after, own)];
  for (const id of inner) frames.push(frameOf(table, pack, id, k.applied, k.before, k.after, k.violations.filter(placedIn(id))));
  made.set(k, frames);
  return frames;
}

const built = new WeakMap<Kernel, Pick<Timeline, 'frames' | 'byEntry' | 'starts'>>();
function readKernel(table: Table, pack: DataPack, line: Kernel): Pick<Timeline, 'frames' | 'byEntry' | 'starts'> {
  const known = built.get(line);
  if (known) return known;
  const turns = line.rounds.flatMap(r => r.turns);
  const groups = line.frames.map((k, i) => framesOfTurn(table, pack, turns[i], k));
  const frames = groups.flat();
  // Where each kernel frame ends among the frames: the nested ones are counted.
  const ends: number[] = [];
  let total = 0;
  for (const g of groups) ends.push((total += g.length));
  const starts = line.marks.map(mark => ({ number: mark.round.number, start: stateOf(table, pack, mark.start), frames: ends[mark.to - 1] ?? 0 }));
  const read = { frames, byEntry: new Map(frames.map(f => [f.entryId, f])), starts };
  built.set(line, read);
  return read;
}

// ---------------------------------------------------------------------------------------------------------------------

let gameId: string | null = null;
const lines = new Map<string, Timeline>();

export function timelineOf(game: Game, plan: Plan, filter: Filter, pack: DataPack): Timeline {
  if (game.id !== gameId) {
    lines.clear();
    gameId = game.id;
  }
  const key = `${filter}:${plan.id}`;
  const previous = lines.get(key);
  const { table, start } = setupOf(game, pack);
  const kernel = kernelTimeline(table, pack, roundsOf(game, plan, table, pack), filter, { start, previous: previous?.kernel });
  if (previous && previous.kernel === kernel && previous.game === game && previous.plan === plan) return previous;
  const line: Timeline = {
    game, plan, filter, pack, kernel, ...readKernel(table, pack, kernel),
    get end(): GameState { return stateOf(table, pack, kernel.end); },
  };
  lines.set(key, line);
  return line;
}

/** The table of a game, kept for as long as its setup is the same: what a screen outside the plan reads names and notes from. */
/** The table of a game and the board its plans begin from, the objects the timelines of the game stand on. */
export function startOfGame(game: Game, pack: DataPack): { table: Table; start: Board } {
  const { table, start } = setupOf(game, pack);
  return { table, start };
}

export function tableOfGame(game: Game, pack: DataPack): Table {
  return setupOf(game, pack).table;
}

/**
 * The turn of the kernel an entry of the plan stands for, read as it is now (an entry being edited is not yet in the plan).
 * The one place a screen turns an entry into a `Turn` until the editors write turns themselves.
 */
export function turnOfEntry(table: Table, entry: Entry, pack: DataPack): Turn {
  return turnOf(table, entry, pack);
}

/** Forgets every timeline: for tests, and when a game closes. */
export function forgetTimelines(): void {
  lines.clear();
  gameId = null;
  setup = undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// Questions about a timeline.

const ownerOf = (plan: Plan, entryId: string): string | undefined =>
  plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
/** The board as its owner's entry sees it: the opponent's own state for an opponent's entry. */
const seenBy = (board: GameState, owner: string | undefined): GameState => (owner && board.rivals?.[owner]) || board;

/** The whole board just before an entry in a timeline; the end of the plan for an entry never reached. */
export const boardBefore = (line: Timeline, entryId: string): GameState => line.byEntry.get(entryId)?.before ?? line.end;
export const boardAfter = (line: Timeline, entryId: string): GameState => line.byEntry.get(entryId)?.after ?? line.end;
export const seenBefore = (line: Timeline, entryId: string): GameState => seenBy(boardBefore(line, entryId), ownerOf(line.plan, entryId));
export const seenAfter = (line: Timeline, entryId: string): GameState => seenBy(boardAfter(line, entryId), ownerOf(line.plan, entryId));

export const projectionOf = (line: Timeline): Projection => ({
  state: line.end,
  warningsByEntry: Object.fromEntries(line.frames.filter(f => f.applied).map(f => [f.entryId, f.warnings])),
});

const byRound = new WeakMap<Timeline, Map<number, Projection>>();
/**
 * The plan as far as the end of a round: its board, and the warnings of the entries replayed by then. Later rounds
 * would ready planets and clear its tokens. The same timeline and round give the same object back.
 */
export function projectionAtRound(line: Timeline, roundNo: number): Projection {
  let known = byRound.get(line);
  if (!known) byRound.set(line, (known = new Map()));
  let found = known.get(roundNo);
  if (!found) {
    const next = line.starts.findIndex(s => s.number > roundNo);
    const frames = next < 0 ? line.frames : line.frames.slice(0, next === 0 ? 0 : line.starts[next - 1].frames);
    found = {
      state: next < 0 ? line.end : line.starts[next].start,
      warningsByEntry: Object.fromEntries(frames.filter(f => f.applied).map(f => [f.entryId, f.warnings])),
    };
    known.set(roundNo, found);
  }
  return found;
}

/** The kernel's board as the plan stands at the end of a round, as `projectionAtRound` has the old state: later rounds would ready planets and clear its tokens. */
export function boardAtRound(line: Timeline, roundNo: number): Board {
  const next = line.kernel.marks.findIndex(mark => mark.round.number > roundNo);
  return next < 0 ? line.kernel.end : line.kernel.marks[next].start;
}

// The same questions about a game and a plan, for what does not hold a timeline.
export const project = (game: Game, plan: Plan, filter: Filter, pack: DataPack): Projection => projectionOf(timelineOf(game, plan, filter, pack));
/** The state just before an entry applies: by default the forecast, what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: Filter = 'forecast'): GameState =>
  seenBefore(timelineOf(game, plan, filter, pack), entryId);
/** The forecast right after an entry, without what comes later: the map between the repeats of its flight. */
export const stateAfterEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack): GameState =>
  seenAfter(timelineOf(game, plan, 'forecast', pack), entryId);
/** The whole board just before an entry, mine and every opponent's (`rivals`), whoever the entry belongs to. */
export const boardBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: Filter = 'forecast'): GameState =>
  boardBefore(timelineOf(game, plan, filter, pack), entryId);

/**
 * The choices component `id` asks of an entry, with their candidates, from the board just before the entry (forecast)
 * and for whoever the entry belongs to: the one function the editors ask (`choicesOf`, src/game/abilities/choices.ts).
 */
export function choicesBefore(game: Game, entry: Entry, id: string, pack: DataPack): ResolvedChoice[] {
  const plan = game.plans.find(p => p.rounds.some(r => r.entries.some(e => e.id === entry.id))) ?? game.plans.find(p => p.id === game.activePlanId) ?? game.plans[0];
  const { kernel } = timelineOf(game, plan, 'forecast', pack);
  return choicesOf(kernel.table, kernel.byTurn.get(entry.id)?.before ?? kernel.end, turnOf(kernel.table, entry, pack), id, pack);
}

/** The turns of a round as the kernel plays them: the numbers and statuses of its actions are asked of these (src/game/numbering.ts). */
export const turnsOf = (game: Game, round: Round, pack: DataPack): Turn[] =>
  planOf(setupOf(game, pack).table, { rounds: [round] } as Plan, pack)[0].turns;

/** The number of each tactical action of a round, by entry id. */
export const tacticalNumbers = (game: Game, round: Round, pack: DataPack): Record<string, number> => turnNumbers(turnsOf(game, round, pack));

/** The tactical entries of a round as the map shows them: Warfare's free one has the status of its card. */
export function tacticalEntries(game: Game, round: Round, pack: DataPack): Extract<Round['entries'][number], { type: 'tactical' }>[] {
  const turns = turnsOf(game, round, pack);
  return round.entries.flatMap(entry => {
    if (entry.type !== 'tactical') return [];
    const status = statusOf(turns, entry.id);
    return [status && status !== entry.status ? { ...entry, status } : entry];
  });
}

/**
 * What the board itself breaks in a system at the end of a round, apart from any entry: each player's capacity and fleet
 * pool there (16.3, 37.1), as units placed by hand leave them; the passive permits in force for the player lift what they cover.
 */
export function systemWarningsAt(line: Timeline, roundNo: number, slot: string): Warning[] {
  const { game, pack } = line;
  const { table } = setupOf(game, pack);
  const next = line.starts.findIndex(s => s.number > roundNo);
  const board = next < 0 ? line.kernel.end : line.kernel.marks[next].start;
  // Every player's capacity and fleet pool in the system, the viewer first.
  const ordered = [...table.players].sort((x, y) => (x.id === table.viewer ? -1 : y.id === table.viewer ? 1 : 0));
  return ordered.flatMap(({ id }) => waiveBoard(table, board, pack, id, checkSystemOf(stacksOn(table, board, pack, id), slot)));
}
