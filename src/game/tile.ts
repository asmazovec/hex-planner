/**
 * What a tile draws of a board: the stacks of every player in a system, and what a planet shows of its numbers. One
 * code path for everyone: the viewer is the owner `me` (the drawing's name for whose eyes it is), the others are
 * named by their player id and stand after them in seat order.
 */
import { UNIT_ORDER, type GroundStack, type SpaceStack } from '../domain/hexLayout';
import type { PlanetValues } from '../domain/payment';
import type { PlanetDef } from '../domain/types';
import type { Board, DataPack, PlayerId, Table, UnitCounts, UnitId } from './types';
import { planetValue } from './queries';

const unitsOf = (counts: UnitCounts | undefined): { unit: UnitId; count: number }[] =>
  UNIT_ORDER.filter(u => (counts?.[u] ?? 0) > 0).map(unit => ({ unit, count: counts?.[unit] ?? 0 }));

/**
 * The owner name a drawing gives a player: `me` for the one whose eyes they are, for the rest the id a saved game has
 * for them (an opponent's own id; the player id for a table that has none, and for the one that would read as `me`).
 */
export function ownerKey(table: Table, viewer: PlayerId, player: PlayerId): string {
  if (player === viewer) return 'me';
  const named = table.players.find(p => p.id === player)?.legacyId ?? player;
  return named === 'me' ? player : named;
}

/** The player a drawing's owner name stands for. */
export const playerOfOwner = (table: Table, viewer: PlayerId, key: string): PlayerId | undefined =>
  key === 'me' ? viewer : table.players.find(p => p.id !== viewer && ownerKey(table, viewer, p.id) === key)?.id;

/** The players a tile draws besides the viewer, by seat; a stray owner of units written by hand is no player of the map. */
export const othersOf = (table: Table, viewer: PlayerId): Table['players'] => table.players.filter(p => p.id !== viewer && p.seat <= 8);

/** The stacks of a system as a tile draws them: the viewer's, then each other player's by seat, then the ground forces and structures on the planets. */
export function tileStacks(table: Table, board: Board, viewer: PlayerId, slot: string, planets: PlanetDef[]): { space: SpaceStack[]; ground: GroundStack[] } {
  const space: SpaceStack[] = [];
  const ground: GroundStack[] = [];
  const others = othersOf(table, viewer);
  const ships = (player: PlayerId): UnitCounts | undefined => board.systems[slot]?.ships[player];
  for (const { unit, count } of unitsOf(ships(viewer))) space.push({ kind: unit, owner: 'me', count });
  for (const { id } of others) {
    for (const { unit, count } of unitsOf(ships(id))) space.push({ kind: unit, owner: ownerKey(table, viewer, id), count });
    planets.forEach((planet, i) => {
      for (const { unit, count } of unitsOf(board.planets[planet.id]?.ground[id])) ground.push({ kind: unit, owner: ownerKey(table, viewer, id), count, planet: i });
    });
  }
  planets.forEach((planet, i) => {
    const held = board.planets[planet.id];
    for (const { unit, count } of unitsOf(held?.ground[viewer])) ground.push({ kind: unit, owner: 'me', count, planet: i });
    if (held?.owner === undefined) return;
    for (const kind of ['pds', 'spacedock'] as const) {
      const count = held.structures[kind] ?? 0;
      if (count > 0) ground.push({ kind, owner: ownerKey(table, viewer, held.owner), count, planet: i });
    }
  });
  return { space, ground };
}

/**
 * What the screens show of a planet: its resources and influence as the components of its controller and what is
 * attached make them, and whether either differs from the printed numbers. Only a planet the player controls is asked;
 * any other shows the printed values.
 */
export function shownPlanetValues(table: Table, board: Board, pack: DataPack, player: PlayerId, planet: string): PlanetValues {
  const printed = pack.planets[planet];
  const base = { resources: printed?.resources ?? 0, influence: printed?.influence ?? 0 };
  if (board.planets[planet]?.owner !== player) return { ...base, changed: false };
  const resources = planetValue(table, board, pack, player, planet, 'resources');
  const influence = planetValue(table, board, pack, player, planet, 'influence');
  return { resources, influence, changed: resources !== base.resources || influence !== base.influence };
}

/** How many players sit at the table: those who hold a seat (a stray owner of units written by hand is no player of the map). */
export const seatCount = (table: Table): number => table.players.filter(p => p.seat <= 8).length;

/** What a planet shows at a viewer's eyes: who holds it (mine, an enemy's), whether it is exhausted, and its numbers. */
export interface PlanetShown { control?: 'me' | 'enemy'; holder?: PlayerId; exhausted: boolean; values: PlanetValues }

export function planetShown(table: Table, board: Board, pack: DataPack, viewer: PlayerId, planet: string): PlanetShown {
  const held = board.planets[planet];
  const control = held?.owner === undefined ? undefined : held.owner === viewer ? 'me' as const : 'enemy' as const;
  return {
    control, holder: control === 'enemy' ? held?.owner : undefined,
    // Only what a planet of mine, or of no one, has spent shows struck out.
    exhausted: (held?.exhausted ?? false) && (held?.owner === undefined || held.owner === viewer),
    values: shownPlanetValues(table, board, pack, viewer, planet),
  };
}
