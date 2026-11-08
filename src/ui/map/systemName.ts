import { tileIdOf } from '../../domain/project';
import type { DataPack, Game } from '../../domain/types';

/** Printed tile number of a slot, which is what the player sees on the table. */
export function systemName(game: Game, pack: DataPack, slot: string): string {
  const tileId = tileIdOf(game, slot);
  const tile = pack.tiles[tileId];
  if (tile?.kind === 'fracture') return `F${tileId.replace(/\D/g, '')}`;
  return tile?.number ?? tileId;
}
