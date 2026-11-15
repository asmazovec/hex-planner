/** The old big hex record over entries: one adjustment per system, kind and round, which every tap edits; the kernel's is src/game/edit/merged.ts. */
import { changedDelta, isEmptyDelta, type MergedChange, type MergedCount } from '../../../domain/losses';
import type { AdjustmentKind, UnitCounts, UnitId } from '../../../domain/types';
import type { Entry, Round } from './types';

/** `delta.units` is always there, because its `systemId` is what a merged entry is found by. */
type MergedEntry = Extract<Entry, { type: 'adjustment' }>;

export const mergedEntry = (round: Round, kind: AdjustmentKind, systemId: string): MergedEntry | undefined =>
  round.entries.find((e): e is MergedEntry =>
    e.type === 'adjustment' && e.kind === kind && e.status !== 'cancelled' && e.delta.units?.systemId === systemId);

/**
 * One tap on the big hex. The first change makes the entry at the end of the round's action phase, and the entry goes
 * when it nets to nothing. Setup records the board as it stands, so it counts as done; losses and purchases are planned.
 */
export function changeMerged(round: Round, change: MergedChange, newId: () => string): Round {
  if (change.amount === 0) return round;
  const { kind, systemId } = change;
  const found = mergedEntry(round, kind, systemId);
  const delta = changedDelta(found?.delta ?? { units: { systemId, units: {} } }, change);
  if (found) {
    const entries = isEmptyDelta(delta)
      ? round.entries.filter(e => e !== found)
      : round.entries.map(e => (e === found ? { ...found, delta } : e));
    return { ...round, entries };
  }
  const entry: MergedEntry = {
    id: newId(), phase: 'action', status: kind === 'setup' ? 'done' : 'planned', type: 'adjustment', label: '', kind, delta,
  };
  return { ...round, entries: [...round.entries, entry] };
}

/** The signed counts of a merged entry: space first, then by planet. */
export function mergedCounts(round: Round, kind: AdjustmentKind, systemId: string): MergedCount[] {
  const delta = mergedEntry(round, kind, systemId)?.delta;
  const counts = (units: UnitCounts, planetId: string | null): MergedCount[] =>
    (Object.keys(units) as UnitId[]).map(unit => ({ unit, planetId, count: units[unit] ?? 0 }));
  return [
    ...counts(delta?.units?.units ?? {}, null),
    ...Object.entries(delta?.ground ?? {}).flatMap(([planetId, units]) => counts(units, planetId)),
  ];
}
