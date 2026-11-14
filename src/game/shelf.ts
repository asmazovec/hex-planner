/**
 * What a player holds in the shape the component lists read (technologies, hand, relics, notes, leaders, breakthrough),
 * from the kernel's view of the player. While the writers of the game still name players by their old ids (`me`, an
 * opponent id), the notes in it carry those ids as their address.
 */
import { noteAddress, noteBase, noteId } from '../domain/components';
import { holdingsOfCards, legacyKey, playerOfKey, type Shelf } from './keys';
import { tableView, type PlayerView } from './views';
import { genericNotes, factionNotes } from '../domain/holdings';
import { cardsOf } from './queries';
import type { Board, ComponentId, CardHold, DataPack, Table } from './types';

/** A note id with its address, a kernel player id, turned into the old id of that player. */
export function legacyNote(table: Table, id: ComponentId): ComponentId {
  const address = noteAddress(id);
  return address === undefined ? id : noteId(noteBase(id), legacyKey(table, address));
}

/** The kernel id of the player a note, with an old address, belongs to. */
export const noteHolder = (table: Table, address: string): string | undefined => playerOfKey(table, address);

export function shelfOf(table: Table, view: PlayerView): Shelf {
  const cards: Record<ComponentId, CardHold> = {};
  for (const held of Object.values(view.cards).flat()) cards[legacyNote(table, held.id)] = { state: held.state, count: held.count };
  return holdingsOfCards(cards);
}

/** The notes of a player (an old id) and who holds each now (an old id), in the words of the lists that still name players by them. */
export function legacyNotes(table: Table, board: Board, pack: DataPack, owner: string): { id: ComponentId; holder: string | undefined }[] {
  const player = table.players.find(p => p.id === playerOfKey(table, owner));
  if (player === undefined) return [];
  const held = table.players.map(p => ({ key: legacyKey(table, p.id), ids: new Set(cardsOf(board, p.id, 'promissory').map(c => legacyNote(table, c.id))) }));
  return [...genericNotes(pack, owner), ...factionNotes(pack, player.faction, owner)].map(id => ({ id, holder: held.find(h => h.ids.has(id))?.key }));
}

/** What the plan screen shows of each player, by the old id (`me`, an opponent id): the sheet, the docks and PDS on the board, the points. */
export interface Shown { shelf: Shelf; structures: { docks: number; pds: number }; vp: number }

export function shownOf(table: Table, board: Board, pack: DataPack): { players: Record<string, Shown>; laws: ComponentId[] } {
  const view = tableView(table, board, pack);
  const players = Object.fromEntries(view.players.map((p): [string, Shown] => [legacyKey(table, p.id), {
    shelf: shelfOf(table, p),
    structures: { docks: p.planets.filter(planet => (planet.structures.spacedock ?? 0) > 0).length, pds: p.planets.reduce((sum, planet) => sum + (planet.structures.pds ?? 0), 0) },
    vp: p.vp,
  }]));
  return { players, laws: view.laws.map(law => law.id) };
}
