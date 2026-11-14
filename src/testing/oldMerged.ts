/** The old edit of the big hex over entries, kept to pin the kernel's changeOnBoard (src/game/edit/merged.test.ts); it replays the plan through the old projection. */
import { changeMerged, mergedEntry, type MergedChange } from '../domain/losses';
import { project } from './old/domain/project';
import type { DataPack, Entry, Game, Phase, Round } from '../domain/types';
import type { GameState } from './old/domain/types';
import { changedDelta } from '../domain/losses';

type MergedEntry = Extract<Entry, { type: 'adjustment' }>;

const LATER_PHASES: Phase[] = ['action', 'status', 'agenda'];

/** Every unit on the board by place, space and planets apart. */
function boardCounts(state: GameState): Map<string, number> {
  const counts = new Map<string, number>();
  const read = (area: string, record: GameState['systems']) => {
    for (const [place, units] of Object.entries(record)) {
      for (const [unit, n] of Object.entries(units)) if ((n ?? 0) !== 0) counts.set(`${area}|${place}|${unit}`, n ?? 0);
    }
  };
  read('space', state.systems);
  read('ground', state.ground);
  return counts;
}

const sameCounts = (a: Map<string, number>, b: Map<string, number>): boolean =>
  a.size === b.size && [...a].every(([key, n]) => b.get(key) === n);

/**
 * A tap on the board. The replay stops a stack at nothing, so a removal written before the unit arrives would do nothing
 * and leave a negative count behind, while the hex shows the end of the round. Such a removal moves the entry to the end
 * of the first phase where it counts. A place counts only if the board then differs by the tapped unit alone: moving the
 * entry past a later flight can silently drop another of its losses. With no such place the removal gets an entry of its own at the end of the action phase.
 */
export function changeOnBoard(game: Game, round: Round, change: MergedChange, pack: DataPack, newId: () => string): Round {
  const edited = changeMerged(round, change, newId);
  if (change.amount >= 0) return edited;
  const { kind, systemId, unit, planetId } = change;
  const plan = game.plans.find(p => p.id === game.activePlanId);
  if (!plan) return edited;
  const shown = (candidate: Round): Map<string, number> =>
    boardCounts(project(game, { ...plan, rounds: [...plan.rounds.filter(r => r.number < round.number), candidate] }, 'forecast', pack).state);
  const entry = mergedEntry(edited, kind, systemId);
  const rest = edited.entries.filter(e => e !== entry);
  const moved: Round[] = entry
    ? LATER_PHASES.slice(Math.max(0, LATER_PHASES.indexOf(entry.phase))).map(phase => ({ ...edited, entries: [...rest, { ...entry, phase }] }))
    : [];
  const wanted = shown(round);
  const key = planetId === null ? `space|${systemId}|${unit}` : `ground|${planetId}|${unit}`;
  const left = (wanted.get(key) ?? 0) + change.amount;
  if (left < 0) return round;
  if (left === 0) wanted.delete(key);
  else wanted.set(key, left);
  const fits = [edited, ...moved].find(candidate => sameCounts(shown(candidate), wanted));
  if (fits) return fits;
  // No place of the one entry reproduces the board: the removal goes to an entry of its own, behind everything of the action phase.
  const own: MergedEntry = {
    id: newId(), phase: 'action', status: 'planned', type: 'adjustment', kind, label: '',
    delta: changedDelta({ units: { systemId, units: {} } }, change),
  };
  return { ...round, entries: [...round.entries, own] };
}

