/**
 * What two replays of the same game must agree on, written down once: a state as a plain value with what the two models
 * represent differently set aside (empty stacks, the order of a list, a pool the old model let go below zero).
 */
import type { UnitCounts, Warning } from '../domain/types';

export const sorted = (list: readonly string[] | undefined): string[] => [...(list ?? [])].sort();

export const stacks = (record: Record<string, UnitCounts> | undefined): Record<string, UnitCounts> =>
  Object.fromEntries(Object.entries(record ?? {}).flatMap(([key, units]) => {
    const kept = Object.fromEntries(Object.entries(units).filter(([, n]) => (n ?? 0) > 0));
    return Object.keys(kept).length > 0 ? [[key, kept]] : [];
  }));

/** A warning as plain data, in a fixed form to sort and compare. */
export const warningKey = (w: Warning): string =>
  JSON.stringify([w.code, Object.entries(w.params).sort(([a], [b]) => (a < b ? -1 : 1)), w.step ?? null, w.rule ?? null, w.place ?? null, [...(w.waivedBy ?? [])].sort()]);

export const normalWarnings = (warnings: readonly Warning[]): string[] => warnings.map(warningKey).sort();
