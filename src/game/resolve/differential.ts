/**
 * The proof that the kernel resolves a tactical turn as the old replay does: for every tactical entry of a plan, the old
 * frame before it is rebuilt as a board, the entry is resolved on it, and the board read back through the old model must
 * equal the old frame after it, with the same warnings. Where the two disagree and the old one is wrong by the rules, the
 * case is excluded here with its reason and listed in docs/superpowers/specs/2026-11-13-game-model-differences.md.
 */
import { timeline, type Filter } from '../../domain/replay/timeline';
import { heldCards } from '../../domain/strategy';
import type { DataPack, Entry, Game, Plan, Round } from '../../domain/types';
import { applyAll } from '../apply';
import type { GameEvent } from '../events';
import { normalState, normalWarnings } from '../compare';
import { boardFromLegacy, boardOf, legacyState, tableOf, turnOf } from '../fromLegacy';
import { placeIn } from '../../domain/rules/registry';
import { statusEnd } from '../round';
import { planOf, timeline as kernelTimeline } from '../timeline';
import { resolveTurn } from './index';
import { newTrack } from './track';

export interface Outcome {
  game: string;
  entry: string;
  agree: boolean;
  /** The kind of entry. */
  type: Entry['type'];
  /** What differs: `state` (the board after), `warnings`, or `error`. */
  diffs: ('state' | 'warnings' | 'error')[];
  /** Set when the old frame is wrong by the rules and the case is set aside, with the reason. */
  excluded?: string;
  detail?: string;
}

/** A case where the old replay is wrong by the rules (or the kernel is, knowingly), and the reason. */
export interface Exclusion { reason: string; matches(outcome: Outcome, detail: Detail): boolean }
export interface Detail { oldState: unknown; newState: unknown; oldWarnings: string[]; newWarnings: string[] }

export function compareGame(game: Game, pack: DataPack, label = game.id, plan: Plan | undefined = game.plans.find(p => p.id === game.activePlanId), filter: Filter = 'forecast'): { outcomes: Outcome[]; details: Map<Outcome, Detail> } {
  const outcomes: Outcome[] = [];
  const details = new Map<Outcome, Detail>();
  if (!plan) return { outcomes, details };
  const line = timeline(game, plan, filter, pack);
  const table = tableOf(game);
  const entries = new Map<string, { entry: Entry; round: Round }>();
  for (const round of plan.rounds) for (const entry of round.entries) entries.set(entry.id, { entry, round });
  const frameOf = new Map(line.frames.map(f => [f.entryId, f]));
  let track = newTrack();
  let current: Round | undefined;
  /** The expedition slices taken so far: a board rebuilt from the old frame does not know them (the kernel timeline carries them). */
  let taken: GameEvent[] = Object.entries(boardOf(game, pack).common.expedition).map(([slice, player]) => ({ type: 'ExpeditionSliceTaken' as const, player, slice }));
  for (const frame of line.frames) {
    const found = entries.get(frame.entryId);
    if (!found || !frame.applied) continue;
    const { entry, round } = found;
    if (round !== current) {
      current = round;
      track = newTrack({ [table.viewer]: heldCards(round, game.playerCount) });
    }
    // Warfare's free action is part of its card: it is resolved with the card and its frame is the card's.
    if (entry.type === 'tactical' && entry.fromCard && entries.has(entry.fromCard)) continue;
    const linked = entry.type === 'strategic' ? round.entries.find(e => e.type === 'tactical' && e.fromCard === entry.id) : undefined;
    const outcome: Outcome = { game: label, entry: entry.id, agree: true, type: entry.type, diffs: [] };
    outcomes.push(outcome);
    try {
      const board = applyAll(boardFromLegacy(table, frame.before, pack), taken);
      const resolution = resolveTurn(table, board, turnOf(table, entry, pack, linked), pack, { track });
      track = resolution.track;
      taken = Object.entries(resolution.board.common.expedition).map(([slice, player]) => ({ type: 'ExpeditionSliceTaken' as const, player, slice }));
      // The status phase ends with its entry (81.4, 81.6); the timeline does it once, here it is done for the entry.
      const ended = entry.type === 'statusTokens' ? statusEnd(table, resolution.board, pack) : undefined;
      const finished = ended?.board ?? resolution.board;
      const oldState = normalState(frame.after);
      const newState = normalState(legacyState(table, finished, pack, table.viewer));
      const oldWarnings = normalWarnings([...frame.warnings, ...(linked ? frameOf.get(linked.id)?.warnings ?? [] : [])]);
      const newWarnings = normalWarnings([...resolution.steps.flatMap(s => s.violations), ...placeIn(ended?.violations ?? [], entry.id)]);
      if (canon(oldState) !== canon(newState)) outcome.diffs.push('state');
      // The old replay lets a pool go below zero (20.4, 81.5); the kernel stops at zero, so a board rebuilt from such a frame starts higher.
      const negative = [frame.before, ...Object.values(frame.before.rivals ?? {})].some(st => st.tactic < 0 || st.fleet < 0 || st.strategy < 0);
      if (negative && outcome.diffs.length === 1 && outcome.diffs[0] === 'state') { outcome.excluded = 'pool below zero before the entry'; outcome.diffs.length = 0; }
      if (JSON.stringify(oldWarnings) !== JSON.stringify(newWarnings)) outcome.diffs.push('warnings');
      details.set(outcome, { oldState, newState, oldWarnings, newWarnings });
    } catch (error) {
      outcome.diffs.push('error');
      outcome.detail = error instanceof Error ? `${error.message}\n${error.stack?.split('\n').slice(1, 4).join('\n')}` : String(error);
    }
    outcome.agree = outcome.diffs.length === 0;
  }
  return { outcomes, details };
}

/** A value as text with its keys in order, so that two states compare by what they hold. */
const canon = (value: unknown): string => JSON.stringify(value, (_, v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));

/** What differs between two plain values, as the first few paths and their values: enough to read a failure. */
export function whereDiffers(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (out.length >= 6) return out;
  if (canon(a) === canon(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) whereDiffers((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, out);
  } else out.push(`${path}: old ${JSON.stringify(a)} new ${JSON.stringify(b)}`);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Whole plans: the kernel's timeline (the board flowing from turn to turn) against the old one, after every entry.

/** What the old model keeps differently, so that a difference once seen there goes on through the rest of the plan. */
type Taint = 'pools' | 'structures' | 'vp' | 'exhausted' | 'rivalGoods';
const TAINTS: { taint: Taint; reason: string; matches: RegExp }[] = [
  { taint: 'pools', reason: 'a pool below zero in the old replay (20.4, 81.5); the kernel stops at zero', matches: /^\.(tactic|fleet|strategy)$|^\.rivals\.[^.]+\.(tactic|fleet|strategy)$/ },
  { taint: 'structures', reason: 'a structure on a planet no one controls stays in the old state; in the kernel a structure belongs to its planet\'s owner', matches: /^\.(pds|docks)\b|^\.rivals\.[^.]+\.(pds|docks)\b/ },
  { taint: 'vp', reason: 'the old model keeps a rival\'s points twice (my opponentVp, its own vp) and a status entry moves only the first', matches: /^\.rivals\.[^.]+\.vp$|^\.opponentVp\b/ },
  { taint: 'exhausted', reason: 'a technology the player does not hold stays in the old exhausted list; a board holds no card that is not there', matches: /^.(rivals.[^.]+.)?holdings.exhausted$/ },
  { taint: 'rivalGoods', reason: 'round-start abilities of a rival fire in the kernel (the rules apply to every player); the old replay asked only the viewer', matches: /^.rivals.[^.]+.(tradeGoods|commodities)$/ },
];

const deleteWhere = (state: Record<string, unknown>, taints: Set<Taint>): Record<string, unknown> => {
  const copy = JSON.parse(JSON.stringify(state)) as Record<string, Record<string, unknown>>;
  const strip = (s: Record<string, unknown>, own: boolean): void => {
    if (taints.has('pools')) for (const key of ['tactic', 'fleet', 'strategy']) delete s[key];
    if (taints.has('structures')) { delete s.pds; delete s.docks; }
    if (taints.has('vp') && own) delete s.vp;
    if (taints.has('rivalGoods') && own) { delete s.tradeGoods; delete s.commodities; }
    if (taints.has('exhausted')) delete (s.holdings as Record<string, unknown>).exhausted;
  };
  strip(copy, false);
  if (taints.has('vp')) delete copy.opponentVp;
  for (const rival of Object.values(copy.rivals ?? {})) strip(rival as unknown as Record<string, unknown>, true);
  return copy;
};

/** Every path where two plain values differ. */
function allDiffs(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (canon(a) === canon(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) allDiffs((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, out);
  } else out.push(path);
  return out;
}

export function compareTimelines(game: Game, pack: DataPack, label: string, plan: Plan, filter: Filter): { outcomes: Outcome[]; details: Map<Outcome, Detail> } {
  const outcomes: Outcome[] = [];
  const details = new Map<Outcome, Detail>();
  const table = tableOf(game);
  const old = timeline(game, plan, filter, pack);
  const line = kernelTimeline(table, pack, planOf(table, plan, pack), filter, { start: boardOf(game, pack) });
  const entries = new Map<string, Entry>();
  for (const round of plan.rounds) for (const entry of round.entries) entries.set(entry.id, entry);
  const frameOf = new Map(old.frames.map(f => [f.entryId, f]));
  const taints = new Set<Taint>();
  for (const frame of old.frames) {
    const entry = entries.get(frame.entryId);
    if (!entry || !frame.applied) continue;
    if (entry.type === 'tactical' && entry.fromCard && entries.has(entry.fromCard)) continue;
    const outcome: Outcome = { game: `${label}/${filter}`, entry: entry.id, agree: true, type: entry.type, diffs: [] };
    outcomes.push(outcome);
    const kernel = line.byTurn.get(entry.id);
    if (!kernel) { outcome.diffs.push('error'); outcome.detail = 'no frame'; outcome.agree = false; break; }
    const linked = entry.type === 'strategic' ? [...entries.values()].find(e => e.type === 'tactical' && e.fromCard === entry.id) : undefined;
    const oldState = normalState(frame.after);
    const newState = normalState(legacyState(table, kernel.after, pack, table.viewer));
    const oldWarnings = normalWarnings([...frame.warnings, ...(linked ? frameOf.get(linked.id)?.warnings ?? [] : [])]);
    const newWarnings = normalWarnings(kernel.violations);
    const paths = allDiffs(deleteWhere(oldState, taints), deleteWhere(newState, taints));
    if (paths.length > 0) {
      const set = paths.map(p => TAINTS.find(t => t.matches.test(p)));
      if (set.every(Boolean)) { for (const t of set) taints.add(t!.taint); outcome.excluded = set[0]!.reason; }
      else outcome.diffs.push('state');
    }
    if (JSON.stringify(oldWarnings) !== JSON.stringify(newWarnings) && !(taints.size > 0 && outcome.diffs.length === 0 && warningsOnlyOfTaint(oldWarnings, newWarnings, taints))) outcome.diffs.push('warnings');
    details.set(outcome, { oldState: deleteWhere(oldState, taints), newState: deleteWhere(newState, taints), oldWarnings, newWarnings });
    outcome.agree = outcome.diffs.length === 0;
    // What follows a difference is its consequence: the rest of the plan is not compared.
    if (!outcome.agree) break;
  }
  return { outcomes, details };
}

/**
 * After a taint the warnings that follow what the old model kept differently are not compared: the pool and shortfall
 * ones follow a pool below zero, the production and capacity ones follow a structure on a planet no one controlled
 * (a dock placed by hand on a planet taken later: the kernel has none there, so the system has no PRODUCTION; 8.4).
 */
const warningsOnlyOfTaint = (a: string[], b: string[], taints: Set<Taint>): boolean => {
  const codes = [...(taints.has('pools') ? ['poolNegative', 'shortStrategy', 'shortTactic', 'shortFleet'] : []), ...(taints.has('structures') ? ['productionOver', 'noProduction', 'capacitySystem'] : [])];
  if (codes.length === 0) return false;
  const rest = (list: string[]): string[] => list.filter(w => !codes.some(code => w.startsWith(`["${code}"`)));
  return JSON.stringify(rest(a)) === JSON.stringify(rest(b));
};
