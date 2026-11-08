import type { TFunction } from 'i18next';
import type { DataPack, Game } from '../../domain/types';

// TODO(P2-268) #ws:ui-structure #type:dup #size:s #player-name — Второй модуль имён игроков рядом с players/factionName.ts: свести в players/names.ts
/** How the interface names an opponent: the faction, or the player number when no faction is set. */
export function opponentName(game: Pick<Game, 'opponents'>, pack: DataPack, id: string, t: TFunction): string {
  const index = game.opponents.findIndex(o => o.id === id);
  if (index < 0) return t('players.opponent');
  return pack.factions[game.opponents[index].faction]?.name ?? t('players.player', { n: index + 2 });
}
