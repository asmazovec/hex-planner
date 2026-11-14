import type { TFunction } from 'i18next';
import { loadPack } from '../../data/loadPack';
import type { DataPack } from '../../domain/types';
import { listPlayers } from '../../game/edit/table';
import { legacyKey } from '../../game/keys';
import type { Table } from '../../game/types';

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
 * The opponents of a table by seat, as the screens list them: the id they are called by (the old key), the colour, the
 * faction, the seat and the name, the faction or the player number when none is set (the number counts the list, mine first).
 */
export function opponentsBySeat(table: Table, pack: DataPack, t: TFunction): { id: string; color: number; faction: string; seat: number; name: string }[] {
  return listPlayers(table).slice(1)
    .map((p, index) => ({ id: legacyKey(table, p.id), color: p.color, faction: p.faction, seat: p.seat, name: playerName(pack, p.faction, index + 2, t) }))
    .sort((a, b) => a.seat - b.seat);
}

/** How the interface names a player of a table: the faction, or the player number (the seat) when no faction is set. */
export const nameOfPlayer = (table: Table, pack: DataPack, id: string, t: TFunction): string => {
  const player = table.players.find(p => p.id === id);
  return player ? playerName(pack, player.faction, player.seat, t) : t('players.opponent');
};

/** Every faction of every expansion: a saved game names its faction whatever expansions are on now. */
const allFactions = loadPack(['pok', 'te']).factions;

/** The name of a faction by id, with any expansion; the id itself when no pack knows it. */
export const factionName = (id: string): string => allFactions[id]?.name ?? id;
