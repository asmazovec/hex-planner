/**
 * `resolveTurn`: a turn of a player resolved on the board, step by step in the order of the rules (LRR 89): activation,
 * movement and transport, combat, invasion, production and its payment, then the acts of the turn and the components it
 * uses. Each step builds events, applies them and reports what it found; nothing here forbids anything. Only the
 * tactical action is resolved so far; the other actions are declared and wait for step 2b.
 */
import { hintsAtSteps } from '../abilities/registry';
import { playedBy } from '../../domain/effects/waivers';
import { placeIn } from '../../domain/rules/registry';
import type { Warning } from '../../domain/types';
import type { Turn } from '../actions';
import { blockersOf } from '../space';
import type { Board, DataPack, Table } from '../types';
import { activation } from './activation';
import { afterCombat, canFight, groundLosses, spaceLosses } from './combat';
import { begin, newCtx, NO_TACTICAL, warn, type Ctx, type Resolution } from './context';
import { checkFlow } from './flow';
import { cloneTrack, newTrack, type RoundTrack } from './track';
import { cardAction } from './strategic';
import { componentAction, correctionAction, passAction, statusAction } from './others';
import { claimStations, gainControl, landUnits, placeCarried, type Lost } from './invasion';
import { turnActs } from './acts';
import { playerOfKey } from '../keys';
import { hook } from './hooks';
import { playNamed } from './play';
import { waive } from './waive';
import { turnTail } from './tail';
import { movement, type Flown } from './movement';
import { payProduction, produce } from './production';
import { afterFlights, arrival, finalCheck, removeFleetExcess } from './transport';

export type { Resolution, StepResult } from './context';

export interface ResolveOptions {
  /** The components this player played earlier in the same round: a waiver may last to its end. */
  earlier?: readonly string[];
  /** What the round remembers of its earlier turns; none for the first. */
  track?: RoundTrack;
  /** The warnings of the moments right before the turn (the round or the phase began, the turn started): they stand in a step of their own and the waivers of the turn lift them like its own. */
  moments?: readonly Warning[];
  /** What ends with the turn (the status phase ends with its status entry, 81.4, 81.6): asked once the steps are done, its warnings stand in a step of their own and are waived like the turn's. */
  closing?: (board: Board) => { board: Board; violations: readonly Warning[] };
}

/** A point of the tactical action a reader may stop at: after the activation, after the flights arrived, after the landing, after the production (before it is paid). */
export type Stage = 'activated' | 'moved' | 'landed' | 'built';

/** The tactical action itself (89.1-89.5). `at` is told of each stage; answering true stops the action there (the board stands as it is). */
function tacticalAction(ctx: Ctx, target: string, at?: (stage: Stage, flown?: Flown) => boolean | void): Lost {
  const none: Lost = { planets: [], hooked: [] };
  activation(ctx, target);
  if (at?.('activated')) return none;
  const flown = movement(ctx, target);
  if (at?.('moved', flown)) return none;
  afterFlights(ctx, target, flown);
  // Ships lost where nothing could fight them were lost on the way, before the fleet pool counts the arrival.
  begin(ctx, 'combat');
  const onTheWay = !canFight(ctx, target);
  if (onTheWay) {
    spaceLosses(ctx, target);
    playNamed(ctx, 'combat');
  }
  // The excess beyond the fleet pool goes at once (37.3), so the arrival counts what is left.
  begin(ctx, 'transport');
  const removeLater = removeFleetExcess(ctx, target);
  arrival(ctx, target);
  begin(ctx, 'combat');
  if (!onTheWay) {
    spaceLosses(ctx, target);
    playNamed(ctx, 'combat');
  }
  afterCombat(ctx, target);
  begin(ctx, 'invasion');
  const landed = landUnits(ctx, target);
  begin(ctx, 'combat');
  groundLosses(ctx);
  begin(ctx, 'invasion');
  gainControl(ctx, landed);
  if (at?.('landed')) return none;
  begin(ctx, 'production');
  const producing = produce(ctx, target, removeLater);
  claimStations(ctx, target);
  if (at?.('built')) return none;
  begin(ctx, 'payment');
  payProduction(ctx, producing);
  begin(ctx, 'invasion');
  placeCarried(ctx, target);
  begin(ctx, 'component');
  const entry = ctx.entry as unknown as { production: Record<string, number>; losses?: Record<string, number>; groundLosses?: Record<string, Record<string, number>> };
  const built = Object.values(entry.production).some(n => n > 0);
  const losses = [
    ...Object.entries(entry.losses ?? {}).map(([unit, count]) => ({ unit, count, systemId: target })),
    ...Object.entries(entry.groundLosses ?? {}).flatMap(([planetId, units]) => Object.entries(units).map(([unit, count]) => ({ unit, count, planetId }))),
  ].filter(loss => loss.count > 0);
  // The components in force told of what the action produced and destroyed.
  if (producing && built) hook(ctx, 'onProduced', [ctx.player], { units: entry.production, systemId: target });
  if (losses.length > 0) hook(ctx, 'onDestroyed', [ctx.player], { losses });
  begin(ctx, 'transport');
  finalCheck(ctx, target);
  return landed.lost;
}

/**
 * The board of a tactical turn at the stages of its action, and what the flights carried: the readers of the editors (the
 * meters of a source, the sites of the production, the flight replay) ask these, not a whole resolution.
 */
export function playTactical(table: Table, board: Board, turn: Turn, pack: DataPack): Partial<Record<Stage, Board>> & { flown?: Flown } {
  const action = turn.action;
  const seen: Partial<Record<Stage, Board>> & { flown?: Flown } = {};
  if (action.kind !== 'tactical' || action.system === null) return seen;
  const ctx = newCtx(table, board, turn, action, pack, blockersOf(table, board, turn.player, pack), newTrack());
  tacticalAction(ctx, action.system, (stage, flown) => {
    seen[stage] = ctx.board;
    if (flown) seen.flown = flown;
    return stage === 'built';
  });
  return seen;
}

/** Resolves a turn: the events it brings, the violations it finds, per step, and the board after it. */
export function resolveTurn(table: Table, board: Board, turn: Turn, pack: DataPack, options: ResolveOptions = {}): Resolution {
  const action = turn.action;
  const track = cloneTrack(options.track ?? newTrack());
  if (options.earlier) track.plays[turn.player] = [...(track.plays[turn.player] ?? []), ...options.earlier];
  const ctx = newCtx(table, board, turn, action.kind === 'tactical' ? action : NO_TACTICAL, pack, blockersOf(table, board, turn.player, pack), track);
  if ((options.moments?.length ?? 0) > 0) {
    begin(ctx, 'round');
    warn(ctx, [...options.moments!]);
  }
  begin(ctx, 'round');
  warn(ctx, checkFlow(ctx));
  let lost: Lost = { planets: [], hooked: [] };
  switch (action.kind) {
    case 'tactical':
      if (action.system !== null) lost = tacticalAction(ctx, action.system);
      break;
    case 'strategic':
    case 'secondary':
      cardAction(ctx, action);
      break;
    case 'component': componentAction(ctx); break;
    case 'pass': passAction(ctx); break;
    case 'status': statusAction(ctx); break;
    case 'agenda':
    case 'correction': correctionAction(ctx); break;
  }
  // What the turn uses, plays, gains and loses.
  begin(ctx, 'component');
  turnTail(ctx);
  // Warfare's free action is part of its card: it comes right after the card, before the acts of the turn.
  const nested: Resolution[] = [];
  if (action.kind === 'strategic') {
    for (const inner of action.nested ?? []) {
      const resolved = resolveTurn(table, ctx.board, { ...inner, status: turn.status }, pack, { track: ctx.track });
      nested.push(resolved);
      ctx.board = resolved.board;
      ctx.track = resolved.track;
    }
  }
  begin(ctx, 'transaction');
  turnActs(ctx);
  // A rival's landing takes planets of the viewer's: what the viewer's components hooked on the loss are asked, once the turn is over.
  begin(ctx, 'invasion');
  if (lost.hooked.length > 0) for (const { planetId, to } of lost.planets) hook(ctx, 'onControlLost', [ctx.table.viewer], { planetId, to: playerOfKey(ctx.table, to) ?? to }, { only: lost.hooked });
  if (options.closing) {
    const closed = options.closing(ctx.board);
    ctx.board = closed.board;
    begin(ctx, 'round');
    warn(ctx, [...closed.violations]);
  }
  placeIn(ctx.warnings, turn.id);
  waive(ctx, ctx.warnings, board, ctx.track.plays[turn.player] ?? []);
  const played = playedBy(ctx.entry);
  if (played.length > 0) ctx.track.plays[turn.player] = [...(ctx.track.plays[turn.player] ?? []), ...played];
  const hints = hintsAtSteps(table, ctx.board, pack, turn.player, ctx.steps.map(s => s.step));
  for (const result of ctx.steps) result.hints = hints.get(result.step) ?? [];
  const steps = [...ctx.steps, ...nested.flatMap(n => n.steps)].filter(s => s.events.length > 0 || s.violations.length > 0 || s.hints.length > 0);
  return { steps, board: ctx.board, track: ctx.track };
}

export const warningsOf = (steps: { violations: Warning[] }[]): Warning[] => steps.flatMap(s => s.violations);
