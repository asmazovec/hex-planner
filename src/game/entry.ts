/** What the kernel keeps of the old ids of players (`legacyId`): the key a saved choice or a promissory note address names a player by. */
import type { PlayerId, Table } from './types';

/** The old id (`me` or an opponent id) of a player; the player's own id when the table did not come from an old game. */
export const legacyPlayer = (table: Table, player: PlayerId): string =>
  table.players.find(p => p.id === player)?.legacyId ?? player;

/** The player an old id stands for. */
export const playerOfLegacy = (table: Table, oldId: string): PlayerId | undefined =>
  table.players.find(p => (p.legacyId ?? p.id) === oldId)?.id;
