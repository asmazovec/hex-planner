import type { Game, DataPack, Warning } from '../../../../domain/types';
import type { GameState } from '../types';
import type { TacticalEntry } from '../../../../domain/replay/state';
import { inForceOf, holderOf, effectOf } from '../../../../domain/effects/registry';
import { violation } from '../../../../domain/rules/registry';
import { gameAs } from '../players';

/**
 * Effect, after the token is placed: every player's components in force that answer an activation (`onActivate`) are
 * asked, the owner of the component and the activator being any two players. `shared` is my state, which holds every player's own.
 */
export function reactToActivation(game: Game, state: GameState, shared: GameState, entry: TacticalEntry, target: string, pack: DataPack, warnings: Warning[]): void {
  const activator = entry.owner ?? 'me';
  const states: Record<string, GameState> = { ...(shared.rivals ?? {}), me: shared, [activator]: state };
  for (const [owner, own] of Object.entries(states)) {
    const ownerGame = owner === activator ? game : gameAs(game, owner);
    for (const id of inForceOf(pack, holderOf(ownerGame, own, shared), effect => effect.onActivate !== undefined)) {
      effectOf(pack, id)!.onActivate!({ id, game: ownerGame, pack, owner, activator, entry, systemId: target, state: own, activeState: state, shared, warnings });
    }
  }
}
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
