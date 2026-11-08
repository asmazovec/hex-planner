/** Step 89.3 Combat: the units lost in space and on the planets are removed. */
import type { GameState, Warning } from '../types';
import { take, type TacticalEntry } from './state';

/** Effect: ships lost in the space combat leave the active system; a loss of what is not there is reported. */
export function removeLosses(state: GameState, target: string, entry: TacticalEntry, warnings: Warning[]): void {
  if (entry.losses) take(state.systems, target, entry.losses, warnings, 'combat');
}

/** Effect: ground forces lost on the planets, after the landing. */
export function removeGroundLosses(state: GameState, entry: TacticalEntry, warnings: Warning[]): void {
  for (const [planetId, units] of Object.entries(entry.groundLosses ?? {})) take(state.ground, planetId, units, warnings, 'combat');
}
