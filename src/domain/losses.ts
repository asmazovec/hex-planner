import type { AdjustmentDelta, AdjustmentKind, UnitCounts, UnitId } from './types';
import type { TurnFacts, RoundFacts } from '../game/turnFacts';

/**
 * What the big hex records: one adjustment per system, kind and round, which every tap edits. `delta.units` is always
 * there, because its `systemId` is what a merged entry is found by.
 */
type MergedEntry = Extract<TurnFacts, { type: 'adjustment' }>;

export interface MergedChange {
  kind: AdjustmentKind;
  systemId: string;
  unit: UnitId;
  /** Null for the system's space area. */
  planetId: string | null;
  amount: number;
}

export interface MergedCount { unit: UnitId; planetId: string | null; count: number }

export const mergedEntry = (round: RoundFacts, kind: AdjustmentKind, systemId: string): MergedEntry | undefined =>
  round.entries.find((e): e is MergedEntry =>
    e.type === 'adjustment' && e.kind === kind && e.status !== 'cancelled' && e.delta.units?.systemId === systemId);

/** A zero leaves the record, so that an entry that nets to nothing can be told. */
function shifted(units: UnitCounts, unit: UnitId, amount: number): UnitCounts {
  const next = { ...units };
  const value = (next[unit] ?? 0) + amount;
  if (value === 0) delete next[unit];
  else next[unit] = value;
  return next;
}

export function changedDelta(delta: AdjustmentDelta, { systemId, unit, planetId, amount }: MergedChange): AdjustmentDelta {
  if (planetId === null) return { ...delta, units: { systemId, units: shifted(delta.units?.units ?? {}, unit, amount) } };
  const { [planetId]: current = {}, ...others } = delta.ground ?? {};
  const units = shifted(current, unit, amount);
  const ground = Object.keys(units).length > 0 ? { ...others, [planetId]: units } : others;
  const { ground: dropped, ...rest } = delta;
  void dropped;
  return Object.keys(ground).length > 0 ? { ...rest, ground } : rest;
}

export const isEmptyDelta = (delta: AdjustmentDelta): boolean =>
  Object.keys(delta.units?.units ?? {}).length === 0 && delta.ground === undefined;

/**
 * One tap on the big hex. The first change makes the entry at the end of the round's action phase, and the entry goes
 * when it nets to nothing. Setup records the board as it stands, so it counts as done; losses and purchases are planned.
 */
export function changeMerged(round: RoundFacts, change: MergedChange, newId: () => string): RoundFacts {
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
export function mergedCounts(round: RoundFacts, kind: AdjustmentKind, systemId: string): MergedCount[] {
  const delta = mergedEntry(round, kind, systemId)?.delta;
  const counts = (units: UnitCounts, planetId: string | null): MergedCount[] =>
    (Object.keys(units) as UnitId[]).map(unit => ({ unit, planetId, count: units[unit] ?? 0 }));
  return [
    ...counts(delta?.units?.units ?? {}, null),
    ...Object.entries(delta?.ground ?? {}).flatMap(([planetId, units]) => counts(units, planetId)),
  ];
}
