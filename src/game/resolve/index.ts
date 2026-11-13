/**
 * `resolveTurn`: a turn of a player resolved on the board, step by step in the order of the rules (LRR 89): activation,
 * movement and transport, combat, invasion, production and its payment, then the acts of the turn and the components it
 * uses. Each step builds events, applies them and reports what it found; nothing here forbids anything. Only the
 * tactical action is resolved so far; the other actions are declared and wait for step 2b.
 */
import { hintsAt } from '../../domain/effects/registry';
import { placeIn } from '../../domain/rules/registry';
import type { Warning } from '../../domain/types';
import type { Turn } from '../actions';
import { legacyKey, legacyViews } from '../legacyViews';
import { blockersOf } from '../space';
import type { Board, DataPack, Table } from '../types';
import { activation } from './activation';
import { afterCombat, canFight, groundLosses, spaceLosses } from './combat';
import { begin, newCtx, type Ctx, type Resolution } from './context';
import { claimStations, gainControl, landUnits, placeCarried, type Lost } from './invasion';
import { controlLostHooks, momentsAfter, playNamed, turnActs, turnTail, waived } from './legacyEffects';
import { movement } from './movement';
import { payProduction, produce } from './production';
import { afterFlights, arrival, finalCheck, removeFleetExcess } from './transport';

export type { Resolution, StepResult } from './context';

export interface ResolveOptions {
  /** The components this player played earlier in the same round: a waiver may last to its end. */
  earlier?: readonly string[];
}

/** The tactical action itself (89.1-89.5). */
function tacticalAction(ctx: Ctx, target: string): Lost {
  activation(ctx, target);
  const flown = movement(ctx, target);
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
  begin(ctx, 'production');
  const producing = produce(ctx, target, removeLater);
  claimStations(ctx, target);
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
  momentsAfter(ctx, producing && built ? { units: entry.production, systemId: target } : null, losses);
  begin(ctx, 'transport');
  finalCheck(ctx, target);
  return landed.lost;
}

/** Resolves a turn: the events it brings, the violations it finds, per step, and the board after it. */
export function resolveTurn(table: Table, board: Board, turn: Turn, pack: DataPack, options: ResolveOptions = {}): Resolution {
  const tactical = turn.action;
  if (tactical.kind !== 'tactical') throw new Error(`resolveTurn: a ${tactical.kind} action is not resolved yet`);
  const before = legacyViews(table, board, pack);
  const ctx = newCtx(table, board, turn, tactical, pack, blockersOf(table, board, turn.player, pack));
  const target = tactical.system;
  const lost: Lost = target === null ? { planets: [], hooked: [] } : tacticalAction(ctx, target);
  // What the turn uses, plays, gains and loses; its transactions and its expedition.
  begin(ctx, 'component');
  turnTail(ctx);
  begin(ctx, 'transaction');
  turnActs(ctx);
  // A rival's landing takes planets of the viewer's: what the viewer's components hooked on the loss are asked, once the turn is over.
  begin(ctx, 'invasion');
  controlLostHooks(ctx, lost.planets, lost.hooked);
  const after = legacyViews(table, ctx.board, pack);
  placeIn(ctx.warnings, turn.id);
  waived(ctx, ctx.warnings, before, after, options.earlier);
  const key = legacyKey(table, turn.player);
  for (const result of ctx.steps) result.hints = hintsAt(pack, after.states.me, result.step, [key]);
  const steps = ctx.steps.filter(s => s.events.length > 0 || s.violations.length > 0 || s.hints.length > 0);
  return { steps, board: ctx.board };
}

export const warningsOf = (steps: { violations: Warning[] }[]): Warning[] => steps.flatMap(s => s.violations);
