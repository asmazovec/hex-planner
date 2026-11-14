/** Helpers of the rules tests for LRR 83 to 101, on top of the shared kit. */
import type { DataPack } from '../../types';
import type { Entry, Game } from '../../../testing/old/domain/types';
import type { Player } from '../../players';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, tactical, TARGET } from '../kit';

/** The cards I took in the first round: the main one and, with three or four players, the second. */
export function holding(game: Game, strategyCard: number | null, backupCard: number | null = null): Game {
  const [first, ...rest] = game.plans[0].rounds;
  return { ...game, plans: [{ ...game.plans[0], rounds: [{ ...first, strategyCard, backupCard }, ...rest] }] };
}

export const RIVAL: Player = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

/** An entry expected of the rival. */
export const ofRival = (entry: Entry): Entry => ({ ...entry, owner: RIVAL.id });

/** The test row with some tiles replaced. */
export const row = (tiles: Partial<Record<string, string>> = {}): Record<string, string> =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

/** Ships fly from `from` along `via` into the active system; the warning codes of that action. */
export function flight(pack: DataPack, from: string, active: string, via: string[], map = row(), units = { cruiser: 1 }): string[] {
  const action = tactical(active, { moves: [{ from, units, via }] });
  const game = rulesGame({ map, units: { [from]: units }, entries: [action] });
  return codesOf(game, pack, action);
}
