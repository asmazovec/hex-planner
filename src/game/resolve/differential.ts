/**
 * The proof that the kernel resolves a tactical turn as the old replay does: for every tactical entry of a plan, the old
 * frame before it is rebuilt as a board, the entry is resolved on it, and the board read back through the old model must
 * equal the old frame after it, with the same warnings. Where the two disagree and the old one is wrong by the rules, the
 * case is excluded here with its reason and listed in docs/superpowers/specs/2026-11-13-game-model-differences.md.
 */
import { playedBy } from '../../domain/effects/waivers';
import { timeline } from '../../domain/replay/timeline';
import type { DataPack, Entry, Game, Plan, Warning } from '../../domain/types';
import { normalState, normalWarnings } from '../compare';
import { boardFromLegacy, legacyState, tableOf, turnOf } from '../fromLegacy';
import { resolveTurn } from './index';

/** The checks of the round's flow, which read the whole round and not the turn: they belong to the resolution of the round (step 2b). */
const FLOW_CODES = new Set(['actionAfterPass', 'passBeforeStrategy', 'actionOutsidePhase']);

export interface Outcome {
  game: string;
  entry: string;
  agree: boolean;
  /** What differs: `state` (the board after), `warnings`, or `error`. */
  diffs: ('state' | 'warnings' | 'error')[];
  detail?: string;
}

/** A case where the old replay is wrong by the rules (or the kernel is, knowingly), and the reason. */
export interface Exclusion { reason: string; matches(outcome: Outcome, detail: Detail): boolean }
export interface Detail { oldState: unknown; newState: unknown; oldWarnings: string[]; newWarnings: string[] }

export function compareGame(game: Game, pack: DataPack, label = game.id, plan: Plan | undefined = game.plans.find(p => p.id === game.activePlanId)): { outcomes: Outcome[]; details: Map<Outcome, Detail> } {
  const outcomes: Outcome[] = [];
  const details = new Map<Outcome, Detail>();
  if (!plan) return { outcomes, details };
  const line = timeline(game, plan, 'forecast', pack);
  const table = tableOf(game);
  const entries = new Map<string, { entry: Entry; round: number }>();
  for (const round of plan.rounds) for (const entry of round.entries) entries.set(entry.id, { entry, round: round.number });
  const played = new Map<string, string[]>();
  for (const frame of line.frames) {
    const found = entries.get(frame.entryId);
    if (!found || !frame.applied) continue;
    const { entry, round } = found;
    const owner = `${round}:${entry.owner ?? 'me'}`;
    const earlier = played.get(owner) ?? [];
    played.set(owner, [...earlier, ...playedBy(entry)]);
    if (entry.type !== 'tactical' || entry.systemId === null) continue;
    const outcome: Outcome = { game: label, entry: entry.id, agree: true, diffs: [] };
    outcomes.push(outcome);
    try {
      const board = boardFromLegacy(table, frame.before, pack);
      const resolution = resolveTurn(table, board, turnOf(table, entry, pack), pack, { earlier });
      const oldState = normalState(frame.after);
      const newState = normalState(legacyState(table, resolution.board, pack, table.viewer));
      const oldWarnings = normalWarnings(frame.warnings.filter((w: Warning) => !FLOW_CODES.has(w.code)));
      const newWarnings = normalWarnings(resolution.steps.flatMap(s => s.violations));
      if (canon(oldState) !== canon(newState)) outcome.diffs.push('state');
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
