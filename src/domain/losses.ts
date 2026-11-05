import { project } from './project';
import type { AdjustmentDelta, AdjustmentKind, DataPack, Entry, Game, Phase, Round, UnitCounts, UnitId } from './types';

/**
 * What the big hex records: one adjustment per system, kind and round, which every tap edits. `delta.units` is always
 * there, because its `systemId` is what a merged entry is found by.
 */
type MergedEntry = Extract<Entry, { type: 'adjustment' }>;

export interface MergedChange {
  kind: AdjustmentKind;
  systemId: string;
  unit: UnitId;
  /** Null for the system's space area. */
  planetId: string | null;
  amount: number;
}

export interface MergedCount { unit: UnitId; planetId: string | null; count: number }

export const mergedEntry = (round: Round, kind: AdjustmentKind, systemId: string): MergedEntry | undefined =>
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

function changedDelta(delta: AdjustmentDelta, { systemId, unit, planetId, amount }: MergedChange): AdjustmentDelta {
  if (planetId === null) return { ...delta, units: { systemId, units: shifted(delta.units?.units ?? {}, unit, amount) } };
  const { [planetId]: current = {}, ...others } = delta.ground ?? {};
  const units = shifted(current, unit, amount);
  const ground = Object.keys(units).length > 0 ? { ...others, [planetId]: units } : others;
  const { ground: dropped, ...rest } = delta;
  void dropped;
  return Object.keys(ground).length > 0 ? { ...rest, ground } : rest;
}

const isEmpty = (delta: AdjustmentDelta): boolean =>
  Object.keys(delta.units?.units ?? {}).length === 0 && delta.ground === undefined;

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
    const entries = isEmpty(delta)
      ? round.entries.filter(e => e !== found)
      : round.entries.map(e => (e === found ? { ...found, delta } : e));
    return { ...round, entries };
  }
  const entry: MergedEntry = {
    id: newId(), phase: 'action', status: kind === 'setup' ? 'done' : 'planned', type: 'adjustment', label: '', kind, delta,
  };
  return { ...round, entries: [...round.entries, entry] };
}

const LATER_PHASES: Phase[] = ['action', 'status', 'agenda'];

/**
 * A tap on the board. The replay stops a stack at nothing, so a removal written before the unit arrives would do nothing
 * and leave a negative count behind, while the hex shows the end of the round. Such a removal moves the entry to the end
 * of the first phase where it counts; one that counts nowhere leaves the round as it was.
 */
export function changeOnBoard(game: Game, round: Round, change: MergedChange, pack: DataPack, newId: () => string): Round {
  const edited = changeMerged(round, change, newId);
  if (change.amount >= 0) return edited;
  const { kind, systemId, unit, planetId } = change;
  const plan = game.plans.find(p => p.id === game.activePlanId);
  if (!plan) return edited;
  const shown = (candidate: Round): number => {
    const { state } = project(game, { ...plan, rounds: [...plan.rounds.filter(r => r.number < round.number), candidate] }, 'forecast', pack);
    return (planetId === null ? state.systems[systemId] : state.ground[planetId])?.[unit] ?? 0;
  };
  const entry = mergedEntry(edited, kind, systemId);
  const rest = edited.entries.filter(e => e !== entry);
  const moved: Round[] = entry
    ? LATER_PHASES.slice(Math.max(0, LATER_PHASES.indexOf(entry.phase))).map(phase => ({ ...edited, entries: [...rest, { ...entry, phase }] }))
    : [];
  const wanted = shown(round) + change.amount;
  return [edited, ...moved].find(candidate => shown(candidate) === wanted) ?? round;
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
