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
import { boardFromLegacy, legacyState, tableOf, turnOf } from '../fromLegacy';
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
  let taken: GameEvent[] = [];
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
      const oldState = normalState(frame.after);
      const newState = normalState(legacyState(table, resolution.board, pack, table.viewer));
      const oldWarnings = normalWarnings([...frame.warnings, ...(linked ? frameOf.get(linked.id)?.warnings ?? [] : [])]);
      const newWarnings = normalWarnings(resolution.steps.flatMap(s => s.violations));
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
