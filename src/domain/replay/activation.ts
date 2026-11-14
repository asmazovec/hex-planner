/** Step 89.1 Activation: a command token from the tactic pool goes to the active system. */
import { choicesFor } from '../effects/choices';
import { effectOf, holderOf, inForceOf } from '../effects/registry';
import { playedBy } from '../effects/waivers';
import '../effects/points/movement';
import { gameAs } from '../players';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, Warning } from '../types';
import type { TacticalEntry } from './state';

/**
 * Effect, after the token is placed: every player's components in force that answer an activation (`onActivate`) are
 * asked, the owner of the component and the activator being any two players; then the components the entry names
 * whose `play` runs at the activation (`playAt: 'activation'`). `shared` is my state, which holds every player's own.
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
  playNamedAt('activation', game, state, shared, entry, pack, warnings);
}

/** The `play` of each component the entry names that asks to run at this step of the action, with no choices (a tactical action has none). */
export function playNamedAt(at: 'activation' | 'combat', game: Game, state: GameState, shared: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[], only?: readonly string[]): void {
  for (const id of playedBy(entry)) {
    if (only && !only.includes(id)) continue;
    const effect = effectOf(pack, id);
    if (effect?.playAt === at) effect.play?.({
      game, state, shared, entry, id, player: entry.owner ?? 'me', states: { ...(shared.rivals ?? {}), me: shared, [entry.owner ?? 'me']: state },
      choices: choicesFor(entry, id), held: true, pack, warnings,
    });
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
