import type { GameState } from '../../types';
import { type Spent } from '../../../../../domain/effects/points/status';
import type { EffectTurn } from '../types';
import { violation } from '../../../../../domain/rules/registry';
import { applyPayment, checkPayment } from '../../replay/payment';

export const PAID = new WeakMap<GameState, Map<string, Spent>>();
/**
 * Takes what the status entry's `spend` names (LRR 61.10) from the board, once for the entry however many objectives it
 * scores, and says what it came to, so that each objective's own `play` compares it with the cost on its card:
 *   const spent = spentOnObjectives(turn);
 *   if (spent.tokens < 6) turn.warnings.push(objectiveNotMet(id, spent.tokens, 6));
 * Warns by itself of a pool taken below zero (`poolNegative`), of trade goods not held (`shortTradeGoods`) and of planets
 * not controlled or already exhausted (`planetNotControlled`, `planetExhausted`), all at the step `status`. A cost is a
 * number the objective names, so it never warns of too little: that is the objective's own `objectiveUnmet`.
 */
export function spentOnObjectives(turn: EffectTurn): Spent {
  const done = PAID.get(turn.state) ?? new Map<string, Spent>();
  PAID.set(turn.state, done);
  const known = done.get(turn.entry.id);
  if (known) return known;
  const spend = turn.entry.type === 'statusTokens' ? turn.entry.spend ?? {} : {};
  const { state, warnings } = turn;
  let tokens = 0;
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const count = spend[pool] ?? 0;
    if (count <= 0) continue;
    state[pool] -= count;
    tokens += count;
    if (state[pool] < 0) warnings.push(violation('poolNegative', { pool, have: state[pool] }, 'status'));
  }
  const tradeGoods = Math.max(0, spend.tradeGoods ?? 0);
  if (tradeGoods > state.tradeGoods) warnings.push(violation('shortTradeGoods', { needed: tradeGoods, have: state.tradeGoods }, 'status'));
  state.tradeGoods -= Math.min(tradeGoods, state.tradeGoods);
  const paid = (kind: 'resources' | 'influence'): number => {
    const payment = { planets: spend[kind]?.planets ?? [], tradeGoods: 0 };
    for (const warning of checkPayment(state, payment)) warnings.push(violation(warning.code, warning.params, 'status'));
    return applyPayment(state, payment, kind, turn.pack);
  };
  const spent = { tokens, tradeGoods, resources: paid('resources'), influence: paid('influence') };
  done.set(turn.entry.id, spent);
  return spent;
}
