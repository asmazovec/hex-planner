/** Step 89.1 Activation: a command token from the tactic pool goes to the active system. */
import { violation } from '../rules/registry';
import type { GameState, Warning } from '../types';
import type { TacticalEntry } from './state';

/** Check, over the state before activation: the system already holds my token (5.2), or the tactic pool is empty (20.4). */
export function checkActivation(state: GameState, target: string, entry: TacticalEntry): Warning[] {
  if (entry.free) return [];
  const warnings: Warning[] = [];
  if (state.tokensOnMap.includes(target)) warnings.push(violation('systemHasToken', { systemId: target }));
  if (state.tactic < 1) warnings.push(violation('poolNegative', { pool: 'tactic', have: state.tactic - 1 }, 'activation'));
  return warnings;
}

/** Effect: unless the action is free, a tactic token leaves the pool for the active system. */
export function activate(state: GameState, target: string, entry: TacticalEntry): void {
  if (entry.free) return;
  state.tactic -= 1;
  if (!state.tokensOnMap.includes(target)) state.tokensOnMap.push(target);
}
