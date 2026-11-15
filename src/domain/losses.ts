import type { AdjustmentDelta, AdjustmentKind, UnitCounts, UnitId } from './types';

/** A tap of the big hex: one adjustment per system, kind and round is what every tap edits (`src/game/edit/merged.ts`). */
export interface MergedChange {
  kind: AdjustmentKind;
  systemId: string;
  unit: UnitId;
  /** Null for the system's space area. */
  planetId: string | null;
  amount: number;
}

export interface MergedCount { unit: UnitId; planetId: string | null; count: number }

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
