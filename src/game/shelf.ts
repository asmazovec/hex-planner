/**
 * What a player holds in the shape the component lists read (technologies, hand, relics, notes, leaders, breakthrough),
 * from the kernel's view of the player. A note carries the id of the player whose note it is as its address.
 */
import { componentById, noteAddress, noteId } from '../domain/components';
import { holdingsOfCards, type Shelf } from './keys';
import { tableView } from './views';
import type { ComponentDef } from '../domain/types';
import type { Board, ComponentId, DataPack, PlayerId, Table } from './types';

/** The cards a catalogue note stands for at the table: a generic note is one card of each player, a faction's note the card of each player of that faction; anything else is itself. */
export function noteCardsOf(table: Table, pack: DataPack, def: ComponentDef): ComponentDef[] {
  if (def.kind !== 'promissory' || noteAddress(def.id) !== undefined) return [def];
  const cards = table.players.filter(p => def.faction === undefined || def.faction === p.faction).flatMap(p => componentById(pack, noteId(def.id, p.id)) ?? []);
  return cards.length > 0 ? cards : [def];
}

/** Every card the player holds, a purged leader too (the sheet shows it purged), as the lists read them. */
export const shelfOf = (board: Board, player: PlayerId): Shelf => holdingsOfCards(board.players[player]?.cards ?? {});

/** What the plan screen shows of each player, by player id: the sheet, the docks and PDS on the board, the points. */
export interface Shown { shelf: Shelf; structures: { docks: number; pds: number }; vp: number }

export function shownOf(table: Table, board: Board, pack: DataPack): { players: Record<PlayerId, Shown>; laws: ComponentId[] } {
  const view = tableView(table, board, pack);
  const players = Object.fromEntries(view.players.map((p): [PlayerId, Shown] => [p.id, {
    shelf: shelfOf(board, p.id),
    structures: { docks: p.planets.filter(planet => (planet.structures.spacedock ?? 0) > 0).length, pds: p.planets.reduce((sum, planet) => sum + (planet.structures.pds ?? 0), 0) },
    vp: p.vp,
  }]));
  return { players, laws: view.laws.map(law => law.id) };
}
