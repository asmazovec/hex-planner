/**
 * What the big hex records: one correction per system, kind and round, which every tap edits. A tap that removes a unit
 * counts at the place of its turn: the turn moves to the end of the first phase where the removal reads on the board.
 * Pinned against the old edit of entries (`merged.test.ts`).
 */
import { changedDelta, isEmptyDelta, type MergedChange } from '../../domain/losses';
import type { AdjustmentKind, DataPack, Phase } from '../../domain/types';
import type { Turn } from '../actions';
import type { Round } from '../round';
import { timeline } from '../timeline';
import type { Board, PlayerId, Table } from '../types';
import { withTurnAdded, withTurnMoved } from './plan';

const LATER_PHASES: Phase[] = ['action', 'status', 'agenda'];

const isMerged = (turn: Turn, kind: AdjustmentKind, systemId: string): boolean =>
  turn.action.kind === 'correction' && turn.action.purpose === kind && turn.status !== 'cancelled' && turn.action.delta.units?.systemId === systemId;

/** The turn that holds the corrections of this kind in this system, if the round has one. */
export const mergedTurn = (round: Round, kind: AdjustmentKind, systemId: string): Turn | undefined =>
  round.turns.find(turn => isMerged(turn, kind, systemId));

const newTurn = (id: string, player: PlayerId, status: Turn['status'], kind: AdjustmentKind, delta: Extract<Turn['action'], { kind: 'correction' }>['delta']): Turn =>
  ({ id, player, status, phase: 'action', action: { kind: 'correction', label: '', delta, purpose: kind }, acts: [], used: [] });

/** A zero leaves the record, so that a turn that nets to nothing can be told. The first change makes the turn; setup counts as done. */
export function changeMerged(round: Round, change: MergedChange, newId: () => string, viewer: PlayerId): Round {
  if (change.amount === 0) return round;
  const { kind, systemId } = change;
  const found = mergedTurn(round, kind, systemId);
  const was = found?.action.kind === 'correction' ? found.action.delta : { units: { systemId, units: {} } };
  const delta = changedDelta(was, change);
  if (found && found.action.kind === 'correction') {
    const action = found.action;
    return { ...round, turns: isEmptyDelta(delta) ? round.turns.filter(t => t !== found) : round.turns.map(t => (t === found ? { ...found, action: { ...action, delta } } : t)) };
  }
  return withTurnAdded(round, newTurn(newId(), viewer, kind === 'setup' ? 'done' : 'planned', kind, delta));
}

/** Every unit of the viewer on the board by place, space and planets apart. */
function boardCounts(board: Board, viewer: PlayerId): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [slot, system] of Object.entries(board.systems)) {
    for (const [unit, n] of Object.entries(system.ships[viewer] ?? {})) if ((n ?? 0) !== 0) counts.set(`space|${slot}|${unit}`, n ?? 0);
  }
  for (const [planet, state] of Object.entries(board.planets)) {
    for (const [unit, n] of Object.entries(state.ground[viewer] ?? {})) if ((n ?? 0) !== 0) counts.set(`ground|${planet}|${unit}`, n ?? 0);
  }
  return counts;
}

const sameCounts = (a: Map<string, number>, b: Map<string, number>): boolean =>
  a.size === b.size && [...a].every(([key, n]) => b.get(key) === n);

/**
 * A tap on the board. The replay stops a stack at nothing, so a removal written before the unit arrives would do nothing
 * while the hex shows the end of the round. Such a removal moves the turn to the end of the first phase where it counts: a
 * place counts only if the board then differs by the tapped unit alone. With no such place the removal gets a turn of its
 * own at the end of the action phase. `rounds` are the rounds of the plan, `start` the board the plan begins from.
 */
export function changeOnBoard(
  table: Table, start: Board, pack: DataPack, rounds: Round[], roundNo: number, change: MergedChange, newId: () => string,
): Round | undefined {
  const round = rounds.find(r => r.number === roundNo);
  if (!round) return undefined;
  const viewer = table.viewer;
  const edited = changeMerged(round, change, newId, viewer);
  if (change.amount >= 0) return edited;
  const { kind, systemId, unit, planetId } = change;
  const before = rounds.filter(r => r.number < round.number);
  const shown = (candidate: Round): Map<string, number> =>
    boardCounts(timeline(table, pack, [...before, candidate], 'forecast', { start }).end, viewer);
  const turn = mergedTurn(edited, kind, systemId);
  const moved: Round[] = turn
    ? LATER_PHASES.slice(Math.max(0, LATER_PHASES.indexOf(turn.phase ?? 'action'))).map(phase => withTurnMoved({ ...edited }, turn.id, phase, Number.MAX_SAFE_INTEGER))
    : [];
  const wanted = shown(round);
  const key = planetId === null ? `space|${systemId}|${unit}` : `ground|${planetId}|${unit}`;
  const left = (wanted.get(key) ?? 0) + change.amount;
  if (left < 0) return round;
  if (left === 0) wanted.delete(key);
  else wanted.set(key, left);
  const fits = [edited, ...moved].find(candidate => sameCounts(shown(candidate), wanted));
  if (fits) return fits;
  // No place of the one turn reproduces the board: the removal goes to a turn of its own, behind everything of the action phase.
  return withTurnAdded(round, newTurn(newId(), viewer, 'planned', kind, changedDelta({ units: { systemId, units: {} } }, change)));
}
