/**
 * Setup: what the rules and the faction sheets give each player, as events. One path for every player. The old code did
 * this in pieces (units in `startUnits`, structures in `startStructures`, notes and technologies in `startForFaction`).
 */
import { componentById, componentsOf, noteBase, ownedBy } from '../domain/components';
import { breakthroughOf } from '../domain/effects/breakthrough';
import { factionNotes, genericNotes, holdingsOf, startingTechnologies } from '../domain/holdings';
import { seatSlots } from '../domain/mapBuilder';
import { splitStartUnits } from '../domain/strategy';
import { applyAll } from './apply';
import { emptyBoard, START_POOLS } from './board';
import type { Cause, GameEvent } from './events';
import type { StartHoldings } from '../domain/types';
import type { SavedGame } from './save';
import type { Board, DataPack, Player, PlanetId, PlayerId, Slot, Table } from './types';

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

// ---------------------------------------------------------------------------------------------------------------------
// The board a saved game begins with: the sheet of the viewer's faction, then what `StartEdits` holds.

/** The planets of a faction's own home tile that the tile at its seat does not hold: nothing on the map stands for them. */
function absentHomes(table: Table, player: Player, pack: DataPack): string[] {
  const home = homeOf(table, player, pack);
  const def = pack.factions[player.faction];
  return home === undefined || !def ? [] : (pack.tiles[def.homeTile]?.planetIds ?? []).filter(id => !home.planets.includes(id));
}

type CardState = 'ready' | 'exhausted' | 'inPlay' | 'purged';

/** A player's cards as the start holds them, as events: what the pack does not know is passed over. */
function heldEvents(player: Player, start: StartHoldings | undefined, pack: DataPack): GameEvent[] {
  const h = holdingsOf(start);
  const known = (id: string): boolean => componentById(pack, id) !== undefined;
  const cards = new Map<string, { state: CardState; count: number }>();
  const put = (id: string, state: CardState): void => {
    const was = cards.get(id);
    cards.set(id, { state: was?.state === 'exhausted' ? 'exhausted' : state, count: (was?.count ?? 0) + 1 });
  };
  for (const id of [...h.technologies, ...h.hand, ...h.relics, ...h.promissory, ...h.secrets, ...h.found].filter(known)) put(id, 'ready');
  for (const id of h.scored.filter(known)) put(id, 'inPlay');
  for (const [id, leader] of Object.entries(h.leaders).filter(([id]) => known(id))) cards.set(id, { state: leader === 'unlocked' ? 'ready' : leader, count: 1 });
  const breakthrough = h.breakthrough && player.faction ? breakthroughOf(pack, player.faction) : undefined;
  if (breakthrough) cards.set(breakthrough, { state: h.breakthrough === 'exhausted' ? 'exhausted' : 'ready', count: 1 });
  return [...cards].flatMap(([card, { state, count }]): GameEvent[] => [
    { type: 'CardGained', player: player.id, card, count, ...(state === 'inPlay' ? { state } : {}), cause: SETUP },
    ...(state === 'exhausted' ? [{ type: 'CardExhausted', player: player.id, card, cause: SETUP } as GameEvent] : []),
    ...(state === 'purged' ? [{ type: 'CardPurged', player: player.id, card, cause: SETUP } as GameEvent] : []),
  ]);
}

/**
 * The board a saved game begins with. The viewer's faction sheet places their fleet and home planets; every other
 * player stands as the start says (`StartEdits`: units, ground forces, planets, docks and PDS, written by hand and, when
 * the game begins, from the sheets by `startedGame`). Shelf, points, structures, the expedition and the Fracture are
 * the start's too; the players' homes are theirs from the first.
 */
export function startBoard(saved: SavedGame, pack: DataPack): Board {
  const { table, start } = saved;
  const events: GameEvent[] = [];
  const homes: Record<PlanetId, PlayerId> = {};
  const firsts: Record<PlayerId, PlanetId | undefined> = {};
  const absent: Record<PlayerId, string[]> = {};
  const viewerFirst = [...table.players].sort((a, b) => (a.id === table.viewer ? -1 : b.id === table.viewer ? 1 : 0));
  for (const player of viewerFirst) {
    events.push(...tokenEvents(player));
    const home = homeOf(table, player, pack);
    absent[player.id] = absentHomes(table, player, pack);
    const def = pack.factions[player.faction];
    // A seat the map has no slot for (a player beyond the template) holds the faction's own home planets.
    const planets = home?.planets ?? (def ? pack.tiles[def.homeTile]?.planetIds ?? [] : []);
    firsts[player.id] = planets[0];
    for (const planet of planets) homes[planet] ??= player.id;
    if (player.id === table.viewer && def && home) {
      const split = splitStartUnits(def.startUnits, home.planets[0], pack);
      if (Object.keys(split.space).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { slot: home.slot }, units: split.space, cause: SETUP });
      if (home.planets[0] !== undefined && Object.keys(split.ground).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { planet: home.planets[0] }, units: split.ground, cause: SETUP });
    }
  }
  // Who holds what planet: the start's word, else the home it is; the planets of a home the map has no place for are nobody's.
  const owner: Record<PlanetId, PlayerId> = { ...homes, ...start.control };
  for (const [planet, who] of Object.entries(owner)) if (absent[who]?.includes(planet)) delete owner[planet];
  for (const [planet, player] of Object.entries(owner)) events.push({ type: 'PlanetGained', player, planet, cause: SETUP });
  // Structures stand with whoever holds the planet; those written under an absent home planet stand on the first planet of the tile at the seat.
  for (const [planet, player] of Object.entries(owner)) {
    const from = [planet, ...(absent[player] ?? []).filter(() => firsts[player] === planet)];
    const docks = from.some(id => start.docks.includes(id)) ? 1 : 0;
    const pds = from.reduce((n, id) => n + (start.pds[id] ?? 0), 0);
    const structures = { ...(docks > 0 ? { spacedock: docks } : {}), ...(pds > 0 ? { pds } : {}) };
    if (Object.keys(structures).length > 0) events.push({ type: 'StructurePlaced', player, at: { planet }, structures, cause: SETUP });
  }
  for (const player of table.players) {
    if (player.id !== table.viewer) {
      for (const [slot, byPlayer] of Object.entries(start.units)) if (Object.keys(byPlayer[player.id] ?? {}).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { slot }, units: byPlayer[player.id], cause: SETUP });
      for (const [planet, byPlayer] of Object.entries(start.ground)) if (Object.keys(byPlayer[player.id] ?? {}).length > 0) events.push({ type: 'UnitsPlaced', player: player.id, at: { planet }, units: byPlayer[player.id], cause: SETUP });
    }
    const points = start.points[player.id] ?? 0;
    if (points !== 0) events.push({ type: 'PointsChanged', player: player.id, delta: points, cause: SETUP });
    events.push(...heldEvents(player, start.holdings[player.id], pack));
  }
  if (start.fracture.tiles && Object.keys(start.fracture.tiles).length > 0) events.push({ type: 'FractureOpened', tiles: { ...start.fracture.tiles } });
  for (const [slice, by] of Object.entries(start.expedition.slices)) if (by) events.push({ type: 'ExpeditionSliceTaken', player: by, slice });
  if (start.expedition.thundersEdgeSystem !== null) events.push({ type: 'ThundersEdgeSlotSet', system: start.expedition.thundersEdgeSystem });
  return applyAll(emptyBoard(table), events);
}
