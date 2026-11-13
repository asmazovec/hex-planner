/**
 * Setup: what the rules and the faction sheets give each player, as events. One path for every player. The old code did
 * this in pieces (units in `startUnits`, structures in `startStructures`, notes and technologies in `startForFaction`).
 */
import { componentById, componentsOf, noteBase, ownedBy } from '../domain/components';
import { factionNotes, genericNotes, startingTechnologies } from '../domain/holdings';
import { seatSlots } from '../domain/mapBuilder';
import { splitStartUnits } from '../domain/strategy';
import { applyAll } from './apply';
import { emptyBoard, START_POOLS } from './board';
import type { Cause, GameEvent } from './events';
import type { Board, DataPack, Player, PlanetId, Slot, Table } from './types';

const SETUP: Cause = { step: 'setup' };
/** The ability that purges its player's own Alliance note at setup. */
const HUBRIS = 'Hubris';
const ALLIANCE = /^promissory:.*_an$/;

const tileOf = (table: Table, slot: Slot): string | undefined => table.map[slot]?.split('@')[0];

/**
 * Where a player's home is: the system of their own home tile (for an off-map home with its gate on the map, the tile's
 * own id), else the system at their seat. `planets` are those of the tile that stands there.
 */
export function homeOf(table: Table, player: Player, pack: DataPack): { slot: Slot; planets: PlanetId[] } | undefined {
  const def = pack.factions[player.faction];
  if (!def) return undefined;
  const onMap = (tile: string | undefined) => Object.keys(table.map).find(slot => tileOf(table, slot) === tile);
  const own = onMap(def.homeTile) ?? (def.gateTile !== undefined && onMap(def.gateTile) ? def.homeTile : undefined);
  const slot = own ?? seatSlots(table.players.length, pack, table.layout)[player.seat - 1];
  if (slot === undefined) return undefined;
  // A seat that holds another tile holds that tile's planets; an empty seat falls back to the faction's own.
  const seatTile = own === undefined ? tileOf(table, slot) : undefined;
  return { slot, planets: pack.tiles[seatTile ?? def.homeTile]?.planetIds ?? [] };
}

const tokenEvents = (player: Player): GameEvent[] => [{ type: 'TokensChanged', player: player.id, delta: { ...START_POOLS }, cause: SETUP }];

function notesOf(player: Player, pack: DataPack): GameEvent[] {
  const purged = pack.factions[player.faction]?.abilities.includes(HUBRIS) === true;
  const ids = [...genericNotes(pack, player.id), ...factionNotes(pack, player.faction, player.id)]
    .filter(id => !(purged && ALLIANCE.test(noteBase(id)) && id.endsWith(`@${player.id}`)));
  return ids.map(card => ({ type: 'CardGained', player: player.id, card, cause: SETUP }));
}

/** The leaders of the faction, only with Prophecy of Kings: an agent needs no unlocking (51.4), the rest begin locked. */
function leaderEvents(table: Table, player: Player, pack: DataPack): GameEvent[] {
  if (!table.expansions.includes('pok')) return [];
  return componentsOf(pack).filter(c => c.kind === 'leader' && ownedBy(c, player.faction)).map(c => ({
    type: 'CardGained', player: player.id, card: c.id, state: c.detail?.type === 'agent' ? 'ready' as const : 'locked' as const, cause: SETUP,
  }));
}

function sheetEvents(table: Table, player: Player, pack: DataPack): GameEvent[] {
  const def = pack.factions[player.faction];
  const home = homeOf(table, player, pack);
  if (!def || !home) return [];
  const [first] = home.planets;
  const split = splitStartUnits(def.startUnits, first, pack);
  const events: GameEvent[] = home.planets.map(planet => ({ type: 'PlanetGained', player: player.id, planet, cause: SETUP }));
  if (Object.keys(split.space).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { slot: home.slot }, units: split.space, cause: SETUP });
  if (first !== undefined && Object.keys(split.ground).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { planet: first }, units: split.ground, cause: SETUP });
  const onto = player.setup.structurePlanet !== undefined && home.planets.includes(player.setup.structurePlanet) ? player.setup.structurePlanet : first;
  const structures = Object.fromEntries(Object.entries(def.startStructures ?? {}).filter(([, n]) => n > 0));
  if (onto !== undefined && Object.keys(structures).length > 0) events.push({ type: 'StructurePlaced', player: player.id, at: { planet: onto }, structures, cause: SETUP });
  const techs = [...startingTechnologies(pack, player.faction), ...(player.setup.technologies ?? [])]
    .filter((id, at, all) => all.indexOf(id) === at && componentById(pack, id) !== undefined);
  for (const technology of techs) events.push({ type: 'TechnologyResearched', player: player.id, technology, cause: SETUP });
  return [...events, ...leaderEvents(table, player, pack)];
}

/** Everything the table has at the start of the game, as events in the order of the seats. */
export function setup(table: Table, pack: DataPack): GameEvent[] {
  return table.players.flatMap(player => [...tokenEvents(player), ...sheetEvents(table, player, pack), ...notesOf(player, pack)]);
}

export const initialBoard = (table: Table, pack: DataPack): Board => applyAll(emptyBoard(table), setup(table, pack));
