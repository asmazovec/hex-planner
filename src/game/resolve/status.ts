/**
 * The status phase (LRR 81) for the player whose turn it is: the objectives are asked against the board before the entry
 * (81.1), then the tokens gained and redistributed (81.5), the points, and the objectives scored. The board is already
 * clear (81.4), so only the pools count against the sixteen tokens. The checks are the domain's pure ones.
 */
import { checkFleetPool, checkFleetPoolMax, checkObjectives, checkReinforcements, checkTokensGiven, statusTokensFree } from '../../domain/replay/status';
import { violation } from '../../domain/rules/registry';
import type { Entry, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { playerOfKey } from '../legacyViews';
import { checkView, emit, warn, type Ctx } from './context';
import { applyScored } from './holdings';

type StatusEntry = Extract<Entry, { type: 'statusTokens' }>;
const POOLS = ['tactic', 'fleet', 'strategy'] as const;

function statusTokens(ctx: Ctx, entry: StatusEntry): void {
  let v = checkView(ctx);
  warn(ctx, checkTokensGiven(entry.tactic + entry.fleet + entry.strategy, statusTokensFree(v.game, v.state, v.shared, entry, ctx.pack)));
  for (const pool of POOLS) {
    if (entry[pool] === 0) continue;
    const have = ctx.board.players[ctx.player]?.pools[pool] ?? 0;
    if (entry[pool] < 0 && have + entry[pool] < 0) warn(ctx, violation('poolNegative', { pool, have: have + entry[pool] }, 'status'));
    emit(ctx, [{ type: 'TokensChanged', player: ctx.player, delta: { [pool]: entry[pool] } }], { quiet: true });
  }
  v = checkView(ctx);
  if (entry.tactic + entry.fleet + entry.strategy > 0) warn(ctx, checkReinforcements(v.state, false));
  if (entry.fleet < 0) warn(ctx, checkFleetPool(v.game, v.state, ctx.pack, 'status'));
  if (entry.fleet > 0) warn(ctx, checkFleetPoolMax(v.game, v.state, ctx.pack, v.shared));
  const points: GameEvent[] = [];
  if ((entry.vp ?? 0) !== 0) points.push({ type: 'PointsChanged', player: ctx.player, delta: entry.vp ?? 0 });
  for (const [key, delta] of Object.entries(entry.opponentVp ?? {})) {
    const rival = playerOfKey(ctx.table, key);
    if (key in v.state.opponentVp && rival !== undefined && delta !== 0) points.push({ type: 'PointsChanged', player: rival, delta });
  }
  emit(ctx, points, { quiet: true });
}

/** The whole entry of the phase: what the objectives it scores must meet, the tokens and points, the scoring. */
export function statusAction(ctx: Ctx): void {
  const entry = ctx.entry as StatusEntry;
  const v = checkView(ctx);
  const found: Warning[] = [];
  checkObjectives(v.game, v.state, v.shared, entry, ctx.pack, found);
  warn(ctx, found);
  statusTokens(ctx, entry);
  applyScored(ctx, entry.scored);
}
