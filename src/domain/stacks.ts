/**
 * Who stands where on the board, for a tile and the big hex: the stacks of every player in a system, the holder of a
 * planet, the ground forces of the others on a planet, and how an opponent's units set by hand change.
 */
import { UNIT_ORDER } from './hexLayout';
import type { UnitCounts, UnitId } from './types';

export const unitsOf = (counts: UnitCounts | undefined): { unit: UnitId; count: number }[] =>
  UNIT_ORDER.filter(u => (counts?.[u] ?? 0) > 0).map(unit => ({ unit, count: counts?.[unit] ?? 0 }));
