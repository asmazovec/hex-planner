/** The status phase (LRR 81): tokens gained and redistributed, points scored, then the board cleared and every card readied. */
import { violation } from '../rules/registry';
import { STATUS_TOKENS } from '../strategy';
import type { Entry, GameState, RuleStep, Warning } from '../types';

/** Check: no more tokens gained than the step or card gives. */
// TODO(P2-016) #ws:command-tokens #type:model #rule:20.3 #rule:23.2 #test:020-command-tokens #test:023-component-limitations #size:m #needs:decision #token-supply — Жетонов приказа 16: сумма в резервах и на карте не ограничена. Нужна модель снабжения жетонов (решить, нужна ли)
export function checkTokensGiven(given: number, free: number, step?: RuleStep): Warning[] {
  return given > free ? [violation('tokensOver', { given, free }, step)] : [];
}

/** Steps 81.1 and 81.5: points scored, two tokens gained and the pools redistributed. */
// TODO(P2-017) #ws:command-tokens #type:check #rule:81.5 #rule:37.3 #test:081-status-phase #test:037-fleet-pool #size:s #fleet-pool #redistribute — Перераспределение не проверяет минус в резерве и флот меньше кораблей в системах (после статуса и после перестановки Warfare): poolNegative и fleetPool по всем системам
export function applyStatusTokens(state: GameState, entry: Extract<Entry, { type: 'statusTokens' }>, warnings: Warning[]): void {
  warnings.push(...checkTokensGiven(entry.tactic + entry.fleet + entry.strategy, STATUS_TOKENS));
  state.tactic += entry.tactic;
  state.fleet += entry.fleet;
  state.strategy += entry.strategy;
  state.vp += entry.vp ?? 0;
  for (const [id, points] of Object.entries(entry.opponentVp ?? {})) {
    if (id in state.opponentVp) state.opponentVp[id] += points;
  }
}

/** Steps 81.4 and 81.6, for every player at once: the command tokens leave the board and every exhausted planet is readied. */
export function clearBoard(states: GameState[]): void {
  for (const state of states) {
    state.exhausted = [];
    state.tokensOnMap = [];
  }
}
