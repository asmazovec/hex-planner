/**
 * What a resolution carries from step to step: the board as it stands, the violations so far, and the step being
 * written. Every step builds its events, applies them through `emit` and reports what it found; a shortfall of a stack
 * the board could not give (the old replay's `unitsMissing`) becomes the same violation here.
 */
import type { Blockers } from '../../domain/movement';
import { violation } from '../../domain/rules/registry';
import type { ComponentDef, Entry, Warning } from '../../domain/types';
import type { Tactical, Turn } from '../actions';
import { applyChecked, type Shortfall } from '../apply';
import type { GameEvent } from '../events';
import { legacyEntry } from '../fromLegacy';
import { viewFor, type PlayerView } from '../legacyViews';
import type { Board, DataPack, PlayerId, RuleStep, Table } from '../types';
import type { RoundTrack } from './track';

export interface StepResult {
  step: RuleStep;
  events: GameEvent[];
  violations: Warning[];
  /** The components that only remind, for this step. */
  hints: ComponentDef[];
}

export interface Resolution { steps: StepResult[]; board: Board; /** What the round remembers after this turn. */ track: RoundTrack }

export interface Ctx {
  table: Table;
  pack: DataPack;
  turn: Turn;
  /** The tactical action; an empty one while the turn holds another action. */
  tactical: Tactical;
  /** What the round remembers, as this turn changes it. */
  track: RoundTrack;
  player: PlayerId;
  /** The turn as the old checks read it. */
  entry: Entry;
  board: Board;
  /** The systems where other players' ships end a route, as the board stood before the action. */
  blockers: Blockers;
  steps: StepResult[];
  cur: StepResult;
  /** Every violation of the turn so far, in the order the checks gave them. */
  warnings: Warning[];
}

export function newCtx(table: Table, board: Board, turn: Turn, tactical: Tactical, pack: DataPack, blockers: Blockers, track: RoundTrack): Ctx {
  return {
    table, pack, turn, tactical, track, player: turn.player, entry: legacyEntry(table, turn), board, blockers, steps: [],
    cur: { step: 'activation', events: [], violations: [], hints: [] }, warnings: [],
  };
}

/** Starts the result of a step; the next `begin` closes it. */
export function begin(ctx: Ctx, step: RuleStep): void {
  ctx.cur = { step, events: [], violations: [], hints: [] };
  ctx.steps.push(ctx.cur);
}

export function warn(ctx: Ctx, found: Warning | readonly Warning[]): void {
  const list: readonly Warning[] = Array.isArray(found) ? found : [found as Warning];
  ctx.cur.violations.push(...list);
  ctx.warnings.push(...list);
}

export interface EmitOptions {
  /** The step the missing units are reported at (as the old replay named it); undefined for the code's own. */
  step?: RuleStep;
  /** The old replay took these quietly (a unit not there simply ends the stack empty). */
  quiet?: boolean;
}

/**
 * Applies events to the board and records them. What a stack could not give is returned (and reported as `unitsMissing`
 * unless `quiet`), so the caller can still place what the player entered: an entry forbids nothing.
 */
export function emit(ctx: Ctx, events: GameEvent[], options: EmitOptions = {}): Shortfall[] {
  const short: Shortfall[] = [];
  for (const event of events) {
    const { board, shortfall } = applyChecked(ctx.board, event);
    ctx.board = board;
    ctx.cur.events.push(event);
    for (const s of shortfall ?? []) {
      if (s.what !== 'units' && s.what !== 'structures') continue;
      short.push(s);
      if (!options.quiet) warn(ctx, violation('unitsMissing', { where: s.where ?? '', unit: s.key, missing: s.missing }, options.step));
    }
  }
  return short;
}

/** The board from one player's side as the old checks want it. For a rival owner, the state also sees the others (`rivals`), as mine does. */
export function checkView(ctx: Ctx, player: PlayerId = ctx.player): PlayerView {
  const v = viewFor(ctx.table, ctx.board, ctx.pack, player);
  if (v.key !== 'me') {
    const others = Object.fromEntries(Object.entries(v.views.states).filter(([key]) => key !== v.key));
    v.state.rivals = others;
  }
  return v;
}

/** What stands in for the tactical action while the turn holds another one. */
export const NO_TACTICAL: Tactical = { kind: 'tactical', system: null, movement: [], invasion: [] };
