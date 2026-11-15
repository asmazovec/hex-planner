import type { TFunction } from 'i18next';
import { loadPack } from '../../data/loadPack';
import type { DataPack } from '../../domain/types';
import { seatedPlayers } from '../../game/edit/table';
import type { PlayerId, Table } from '../../game/types';

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

/**
 * The players of a table other than `player` by seat, as the screens list them beside that one: the player id, the
 * colour, the faction, the seat and the name, the faction or the player number (the seat) when none is set.
 */
export function othersBySeat(table: Table, player: PlayerId, pack: DataPack, t: TFunction): { id: PlayerId; color: number; faction: string; seat: number; name: string }[] {
  return seatedPlayers(table).filter(p => p.id !== player)
    .map(p => ({ id: p.id, color: p.color, faction: p.faction, seat: p.seat, name: playerName(pack, p.faction, p.seat, t) }));
}

/** How the interface names a player of a table: the faction, or the player number (the seat) when no faction is set. */
export const nameOfPlayer = (table: Table, pack: DataPack, id: string, t: TFunction): string => {
  const player = table.players.find(p => p.id === id);
  return player ? playerName(pack, player.faction, player.seat, t) : t('players.someone');
};

/** How a narrow place names a player of the table: the short name of the faction, or the player number. */
export const playerShortName = (table: Table, pack: DataPack, id: PlayerId, t: TFunction): string =>
  shortName(pack, table.players.find(p => p.id === id)?.faction ?? '', nameOfPlayer(table, pack, id, t));

/** Every faction of every expansion: a saved game names its faction whatever expansions are on now. */
const allFactions = loadPack(['pok', 'te']).factions;

/** The name of a faction by id, with any expansion; the id itself when no pack knows it. */
export const factionName = (id: string): string => allFactions[id]?.name ?? id;
