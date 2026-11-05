import type { TFunction } from 'i18next';
import type { DataPack, Game } from '../../domain/types';

/** How the interface names an opponent: the faction, or the player number when no faction is set. */
export function opponentName(game: Pick<Game, 'opponents'>, pack: DataPack, id: string, t: TFunction): string {
  const index = game.opponents.findIndex(o => o.id === id);
  return pack.factions[game.opponents[index]?.faction ?? '']?.name ?? t('players.player', { n: index + 2 });
}
