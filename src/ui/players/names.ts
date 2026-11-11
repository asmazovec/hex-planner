import type { TFunction } from 'i18next';
import { loadPack } from '../../data/loadPack';
import type { DataPack, Game } from '../../domain/types';

/** Where the rule below would pick the wrong word. */
const SHORT_NAMES: Record<string, string> = {
  bastion: 'Bastion', ralnel: 'Ral Nel', titans: 'Titans', keleresm: 'Keleres', keleresx: 'Keleres', keleresa: 'Keleres',
};

/** A name that fits beside a token: what follows "of", or else the first word after "The". */
export function factionShortName(id: string, name: string): string {
  if (SHORT_NAMES[id]) return SHORT_NAMES[id];
  const plain = name.replace(/^The /, '');
  return plain.split(' of ')[1] ?? plain.split(' ')[0];
}

/** The short name of a faction of the pack, or `fallback` when the pack has no such faction. */
export const shortName = (pack: DataPack, factionId: string, fallback: string): string => {
  const faction = pack.factions[factionId];
  return faction ? factionShortName(faction.id, faction.name) : fallback;
};

/** How many letters of a short name tell players apart when there is no room for more. */
const TAG_LETTERS = 3;

/** The first letters of a short name, for a line too narrow for whole names. */
export const nameTag = (name: string): string => name.slice(0, TAG_LETTERS);

/** A player by faction, or by the player number `n` when no faction is set. */
export const playerName = (pack: DataPack, factionId: string, n: number, t: TFunction): string =>
  pack.factions[factionId]?.name ?? t('players.player', { n });

/** How the interface names an opponent: the faction, or the player number when no faction is set. */
export function opponentName(game: Pick<Game, 'opponents'>, pack: DataPack, id: string, t: TFunction): string {
  const index = game.opponents.findIndex(o => o.id === id);
  if (index < 0) return t('players.opponent');
  return playerName(pack, game.opponents[index].faction, index + 2, t);
}

/** How a narrow place names an opponent: the short name of the faction, or the player number when no faction is set. */
export function opponentShortName(game: Pick<Game, 'opponents'>, pack: DataPack, id: string, t: TFunction): string {
  return shortName(pack, game.opponents.find(o => o.id === id)?.faction ?? '', opponentName(game, pack, id, t));
}

/** Every faction of every expansion: a saved game names its faction whatever expansions are on now. */
const allFactions = loadPack(['pok', 'te']).factions;

/** The name of a faction by id, with any expansion; the id itself when no pack knows it. */
export const factionName = (id: string): string => allFactions[id]?.name ?? id;
