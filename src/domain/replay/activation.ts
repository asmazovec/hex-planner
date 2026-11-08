/** Step 89.1 Activation: a command token from the tactic pool goes to the active system. */
import type { GameState, Warning } from '../types';
import type { TacticalEntry } from './state';

/** Check, over the state before activation: nothing is checked yet. */
// TODO(P2-015) #ws:command-tokens #type:check #rule:5.2 #rule:89.1 #rule:20.4 #test:005-active-system #test:089-tactical-action #test:020-command-tokens #size:s #activation — Активация системы со своим жетоном и тактика без жетона в тактическом резерве проходят молча: нарушения systemHasToken и poolNegative(tactic)
export function checkActivation(): Warning[] {
  return [];
}

/** Effect: unless the action is free, a tactic token leaves the pool for the active system. */
export function activate(state: GameState, target: string, entry: TacticalEntry): void {
  if (entry.free) return;
  state.tactic -= 1;
  if (!state.tokensOnMap.includes(target)) state.tokensOnMap.push(target);
}
