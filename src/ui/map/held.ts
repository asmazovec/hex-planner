import type { PlanetValues } from '../../domain/payment';
import { planetShown } from '../../game/tile';
import type { Board, DataPack, PlayerId, Table } from '../../game/types';

/**
 * How a planet is held as the one who looks at it sees it: their own, or another player's. The drawing of a planet asks
 * it here and nowhere else; the kernel only says which player holds the planet.
 */
export type Held = 'own' | 'other';

export const heldAs = (holder: PlayerId | undefined, viewer: PlayerId): Held | undefined =>
  (holder === undefined ? undefined : holder === viewer ? 'own' : 'other');

/** What a planet shows to `viewer`: how it is held, by whom, whether it is exhausted, and its numbers. */
export function planetSeen(table: Table, board: Board, pack: DataPack, viewer: PlayerId, planet: string): { held?: Held; holder?: PlayerId; exhausted: boolean; values: PlanetValues } {
  const { holder, exhausted, values } = planetShown(table, board, pack, viewer, planet);
  const held = heldAs(holder, viewer);
  return { ...(held ? { held } : {}), ...(holder === undefined ? {} : { holder }), exhausted, values };
}
