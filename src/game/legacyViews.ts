/**
 * The board seen through the old model, and back: every player's `GameState` of a board (mine with the rivals, laws and
 * the rest "on my state only"), the `Game` those states are asked with, and the events that take one set of states to
 * another. While the old code lives the existing component effects run on these views, and the oracle
 * compares the two models through them. Goes with the old code (step 5 of the move).
 */
import { componentById, noteAddress } from '../domain/components';

import type { DataPack, StructureCounts, UnitCounts } from '../domain/types';
import { SOURCES } from './source';
import type { Cause, GameEvent, Place } from './events';
import type { CardHold, ComponentId, PlayerId } from './types';

export { SOURCES };

export const EMPTY_FRACTURE = { active: false, ingress: [] as string[], seat: null as number | null };

export const countsOf = <T extends object>(units: T | undefined): T => {
  const out: Record<string, unknown> = {};
  for (const key in units) if (((units as Record<string, number | undefined>)[key] ?? 0) > 0) out[key] = (units as Record<string, number>)[key];
  return out as T;
};
export const nonEmpty = (counts: object | undefined): boolean => { for (const _ in counts) return true; return false; };

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** A part of a player's state that comes from one part of the board, kept while that part is the same object: the views shared by readers do not change, so they share these too. */
export function part<T>(kept: WeakMap<object, Map<string, T>>, from: object, key: string, make: () => T, memo: boolean): T {
  if (!memo) return make();
  let by = kept.get(from);
  if (!by) kept.set(from, by = new Map());
  let found = by.get(key);
  if (found === undefined) by.set(key, found = make());
  return found;
}
export interface InSpace { systems: Record<string, UnitCounts>; afloat: Record<string, StructureCounts>; tokensOnMap: string[] }
export const IN_SPACE = new WeakMap<object, Map<string, InSpace>>();
export const ON_BOARD = new WeakMap<object, Map<string, { holds: Record<string, string>; attached?: Record<string, string[]> }>>();

/** What was put on a card and taken off it, as events. */
export function loadEvents(player: PlayerId, card: ComponentId, was: CardHold['onCard'], now: CardHold['onCard'], cause: Cause | undefined): GameEvent[] {
  const c = cause ? { cause } : {};
  const onWas = was ?? { units: {}, technologies: [] };
  const onNow = now ?? { units: {}, technologies: [] };
  const loaded: UnitCounts = {};
  const unloaded: UnitCounts = {};
  for (const unit of new Set([...Object.keys(onWas.units), ...Object.keys(onNow.units)]) as Set<keyof UnitCounts>) {
    const d = (onNow.units[unit] ?? 0) - (onWas.units[unit] ?? 0);
    if (d > 0) loaded[unit] = d;
    if (d < 0) unloaded[unit] = -d;
  }
  const out: GameEvent[] = [];
  for (const technology of onNow.technologies.filter(t => !onWas.technologies.includes(t))) out.push({ type: 'CardLoaded', player, card, technology, ...c });
  for (const technology of onWas.technologies.filter(t => !onNow.technologies.includes(t))) out.push({ type: 'CardUnloaded', player, card, technology, ...c });
  if (nonEmpty(loaded)) out.push({ type: 'CardLoaded', player, card, units: loaded, ...c });
  if (nonEmpty(unloaded)) out.push({ type: 'CardUnloaded', player, card, units: unloaded, ...c });
  return out;
}

export const placeOf = (key: string, isPlanet: boolean): Place => (isPlanet ? { planet: key } : { slot: key });

export function shiftEvents(player: PlayerId, at: Place, before: UnitCounts, after: UnitCounts, cause: Cause | undefined): GameEvent[] {
  const gain: UnitCounts = {};
  const loss: UnitCounts = {};
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof UnitCounts>) {
    const d = (after[id] ?? 0) - (before[id] ?? 0);
    if (d > 0) gain[id] = d;
    if (d < 0) loss[id] = -d;
  }
  return [
    ...(nonEmpty(loss) ? [{ type: 'UnitsRemoved', player, at, units: loss, ...(cause ? { cause } : {}) } as GameEvent] : []),
    ...(nonEmpty(gain) ? [{ type: 'UnitsPlaced', player, at, units: gain, ...(cause ? { cause } : {}) } as GameEvent] : []),
  ];
}

export const knownComponent = (pack: DataPack, id: string): boolean => componentById(pack, id) !== undefined || noteAddress(id) !== undefined;
