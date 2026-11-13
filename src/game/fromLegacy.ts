/**
 * The bridge from the old model while both live: the old `Game` read as a `Table`, and the ids between the two. Plans are
 * not converted here. Goes with the old code (step 5 of the move).
 */
import { playersOf } from '../domain/players';
import type { Game } from '../domain/types';
import type { PlayerId, Table } from './types';

const idOfSeat = (seat: number): PlayerId => `p${seat}`;

/** Me and the opponents become players `p<seat>`, in seat order; the viewer is my player. */
export function tableOf(game: Game): Table {
  const players = playersOf(game).map(p => {
    const start = p.id === 'me' ? game.start.me : game.start.opponents[p.id];
    const technologies = start?.technologies ?? [];
    return {
      id: idOfSeat(p.seat), faction: p.faction, seat: p.seat, color: p.color, legacyId: p.id,
      setup: technologies.length > 0 ? { technologies: [...technologies] } : {},
    };
  }).sort((a, b) => a.seat - b.seat);
  return {
    id: game.id, name: game.name ?? '', expansions: [...game.expansions], layout: game.layout, map: { ...game.map },
    players, viewer: idOfSeat(game.seat),
  };
}

/** The old id (`me` or an opponent id) of a player; the player's own id when the table did not come from an old game. */
export const legacyPlayer = (table: Table, player: PlayerId): string =>
  table.players.find(p => p.id === player)?.legacyId ?? player;

/** The player an old id stands for. */
export const playerOfLegacy = (table: Table, legacy: string): PlayerId | undefined =>
  table.players.find(p => (p.legacyId ?? p.id) === legacy)?.id;
