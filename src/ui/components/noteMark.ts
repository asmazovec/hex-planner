import type { TFunction } from 'i18next';
import { noteOwner, noteText } from '../../domain/holdings';
import type { DataPack, Game } from '../../domain/types';
import { shortName } from '../players/names';

/** Whose card a promissory note is, for `ComponentCard`: the owner's short name and colour, and the text with the owner in it. */
export interface NoteMark {
  owner?: { name: string; color: number };
  text?: string;
}

/**
 * How a note held, played or handed over shows whose it is. `viewer` is the player the game is shown as (`gameAs`),
 * `me` for the game itself. Nothing for any other component, and for a note without an address.
 */
export function noteMark(game: Game, pack: DataPack, id: string, t: TFunction, viewer = 'me'): NoteMark {
  const owner = noteOwner(game, id, viewer);
  if (owner === undefined) return {};
  const player = (who: string) => (who === viewer ? game : game.opponents.find(o => o.id === who));
  const nameOf = (who: string): string => {
    const found = player(who);
    return found ? shortName(pack, found.faction, t('players.player', { n: found.seat })) : who;
  };
  return { owner: { name: nameOf(owner), color: player(owner)?.color ?? 0 }, text: noteText(game, pack, id, nameOf, viewer) };
}
