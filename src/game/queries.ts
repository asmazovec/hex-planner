/**
 * What the board says, with no rules in it yet: no costs, no values of planets. These are the plain reads the rest of
 * the kernel and, through `api.ts`, the interface are allowed to make. Every one answers for a missing place with an empty answer.
 */
import type { Board, CardState, ComponentId, PlanetId, PlayerId, Pools, Slot, StructureCounts, UnitCounts, UnitId } from './types';

/** The units of a player in the space area of a system: ships, and what they carry. */
export const shipsIn = (board: Board, slot: Slot, player: PlayerId): UnitCounts => board.systems[slot]?.ships[player] ?? {};

/** The ground forces of a player on a planet. */
export const groundOn = (board: Board, planet: PlanetId, player: PlayerId): UnitCounts => board.planets[planet]?.ground[player] ?? {};

export const ownerOf = (board: Board, planet: PlanetId): PlayerId | undefined => board.planets[planet]?.owner;

/** The planets a player holds, by id. */
export const planetsOf = (board: Board, player: PlayerId): PlanetId[] =>
  Object.keys(board.planets).filter(id => board.planets[id].owner === player).sort();

/** The structures of a player on planets (those afloat are not on a planet yet), by planet id. */
export const structuresOf = (board: Board, player: PlayerId): { planet: PlanetId; structures: StructureCounts }[] =>
  planetsOf(board, player)
    .filter(id => Object.keys(board.planets[id].structures).length > 0)
    .map(planet => ({ planet, structures: board.planets[planet].structures }));

export interface HeldCard { id: ComponentId; state: CardState; count: number }

/** What a player holds, purged cards left out; `kind` is the part of the id before the colon. */
export function cardsOf(board: Board, player: PlayerId, kind?: string): HeldCard[] {
  return Object.entries(board.players[player]?.cards ?? {})
    .filter(([id, hold]) => hold.state !== 'purged' && (kind === undefined || id.startsWith(`${kind}:`)))
    .map(([id, hold]) => ({ id, state: hold.state, count: hold.count }));
}

export const poolsOf = (board: Board, player: PlayerId): Pools => board.players[player]?.pools ?? { tactic: 0, fleet: 0, strategy: 0 };

// ---------------------------------------------------------------------------------------------------------------------
// What the rules add to what the board says: the numbers an effect may change. They are read through the components in
// force, so they take the table and the pack; the old per-player functions do the counting until the effects move over.
import '../domain/effects/points/invasion';
import type { Holder } from '../domain/effects/registry';
import { productionDueOn, systemProductionOn, type Ground } from '../domain/replay/production';
import { statusTokensFreeOf, tokensOverLimit } from '../domain/replay/status';
import fleetPoolTokens from '../domain/rules/codes/fleetPoolTokens';
import { violation } from '../domain/rules/registry';
import type { Entry, RuleStep, Warning } from '../domain/types';
import { capacity, dockRoom, fleetCount, type Stacks } from '../domain/replay/transport';
import { appliedToPlanet } from '../domain/effects/points/payment';
import { isPlanetCard, PLANET_CARDS, type PaymentKind } from '../domain/payment';
import type { DataPack, UpgradeId } from '../domain/types';
import { linksFrom, type MoveAt } from '../domain/movement';
import { playedBy } from '../domain/effects/waivers';
import type { RouteReads } from '../domain/replay/movement';
import type { Move, TacticalEntry } from '../domain/replay/state';
import { areNeighborsOf } from '../domain/neighbors';
import { systemSlots } from '../domain/replay/board';
import { appliedOn, holderIn } from './abilities/registry';
import { homeOf } from './setup';
import { mapSource, planetsIn, wormholesIn } from './space';
import type { Table } from './types';

const factionOf = (table: Table, player: PlayerId): string => table.players.find(p => p.id === player)?.faction ?? '';

/** Fighters a player's space docks keep in a system: what each dock on its planets keeps, a point of the count (Dimensional Tear II). */
export function dockFighterRoomIn(table: Table, board: Board, pack: DataPack, player: PlayerId, slot: Slot): number {
  const docked = planetsIn(table, board, pack, slot).filter(id => board.planets[id]?.owner === player && (board.planets[id].structures.spacedock ?? 0) > 0);
  return docked.length === 0 ? 0 : dockRoom(factionOf(table, player), docked, slot, holderIn(table, board, player), pack);
}

/** How many ships a system of the player may hold: the fleet pool, after what they hold changed it. */
export function fleetLimit(table: Table, board: Board, pack: DataPack, player: PlayerId): number {
  return appliedOn(table, board, pack, player, 'fleetLimit', poolsOf(board, player).fleet, { faction: factionOf(table, player) }).value;
}

/** A player's stacks as the transport checks read them, from the board alone. */
export function stacksOn(table: Table, board: Board, pack: DataPack, player: PlayerId): Stacks {
  const who = { faction: factionOf(table, player) };
  const holder = (): Holder => holderIn(table, board, player);
  const room = (slot: Slot | null): number => slot === null ? 0 : dockFighterRoomIn(table, board, pack, player, slot);
  return {
    units: slot => shipsIn(board, slot, player),
    capacityOf: (units, slot) => capacity(who, units, holder(), pack, room(slot)),
    fleetOf: (units, slot) => fleetCount(who, units, holder(), pack, room(slot)),
    fleet: () => fleetLimit(table, board, pack, player),
  };
}

/** The load of a player's units in a system against the capacity of their ships there, the system's space docks counted. */
export function capacityIn(table: Table, board: Board, pack: DataPack, player: PlayerId, slot: Slot): { load: number; capacity: number } {
  const stacks = stacksOn(table, board, pack, player);
  return stacks.capacityOf(stacks.units(slot), slot);
}

/** The ships a player has in a system for the fleet pool: flying fighters beyond what the capacity left holds count too. */
export function fleetIn(table: Table, board: Board, pack: DataPack, player: PlayerId, slot: Slot): number {
  const stacks = stacksOn(table, board, pack, player);
  return stacks.fleetOf(stacks.units(slot), slot);
}

/** One player's side of the board as the production maths reads it: the same rules the old per-player state is read with (`groundOf`). */
export function groundIn(table: Table, board: Board, pack: DataPack, player: PlayerId): Ground {
  const planet = (id: PlanetId) => board.planets[id];
  const mine = (id: PlanetId): boolean => planet(id)?.owner === player;
  const others = table.players.map(p => p.id).filter(id => id !== player);
  return {
    faction: factionOf(table, player), map: mapSource(table, board), holder: holderIn(table, board, player),
    mine,
    dock: id => mine(id) && (planet(id).structures.spacedock ?? 0) > 0,
    pds: id => (mine(id) ? planet(id).structures.pds ?? 0 : 0),
    attached: id => planet(id)?.attached ?? [],
    ground: id => groundOn(board, id, player),
    ships: slot => shipsIn(board, slot, player),
    wormholes: slot => wormholesIn(table, board, pack, slot),
    resources: id => planetValue(table, board, pack, player, id, 'resources'),
    othersIn: (slot, withGround) => {
      const planets = withGround ? planetsIn(table, board, pack, slot) : [];
      const standing = (units: UnitCounts): boolean => Object.entries(units).some(([unit, n]) => (n ?? 0) > 0 && (withGround || pack.units[unit as UnitId]?.ground !== true));
      return others.some(other => standing(shipsIn(board, slot, other)) || planets.some(id => withGround && standing(groundOn(board, id, other))));
    },
    onBoard: unit => reinforcementCount(board, player, unit),
    home: () => homeOf(table, table.players.find(p => p.id === player)!, pack)?.slot ?? null,
  };
}

/** The Production value of a player's units in a system, pooled and changed by the components (68.1). */
export function productionLimit(table: Table, board: Board, pack: DataPack, player: PlayerId, slot: Slot): number {
  return systemProductionOn(groundIn(table, board, pack, player), slot, pack);
}

/** What units cost to build in a system, as the player pays it: each unit's cost, the laws, and the combined cost where a unit uses PRODUCTION. */
export function costOf(table: Table, board: Board, pack: DataPack, player: PlayerId, units: UnitCounts, slot?: Slot): number {
  return productionDueOn(groundIn(table, board, pack, player), units, pack, slot === undefined ? undefined : ({ type: 'tactical', systemId: slot } as never));
}

/** What a planet (or a planet card) is worth to its player for a payment, after what they hold and what is attached changed it. */
export function planetValue(table: Table, board: Board, pack: DataPack, player: PlayerId, planet: PlanetId, kind: PaymentKind): number {
  const printed = isPlanetCard(planet) ? PLANET_CARDS[planet] : pack.planets[planet]?.[kind] ?? 0;
  const dock = board.planets[planet]?.owner === player && (board.planets[planet].structures.spacedock ?? 0) > 0;
  return appliedToPlanet(pack, holderIn(table, board, player), board.planets[planet]?.attached ?? [], kind === 'resources' ? 'planetResources' : 'planetInfluence', printed, planet, dock).value;
}

/** The trade goods the components of a player add with each planet they gain control of (Scavenge); the rules themselves add none. */
export function tradeGoodsOnControl(table: Table, board: Board, pack: DataPack, player: PlayerId, planet: PlanetId): number {
  return appliedOn(table, board, pack, player, 'tradeGoodsOnControl', 0, { planetId: planet }).value;
}

/** What a trade good is worth to its player for a payment, after what they hold changed it. */
export function tradeGoodWorth(table: Table, board: Board, pack: DataPack, player: PlayerId, kind: PaymentKind): number {
  return appliedOn(table, board, pack, player, 'tradeGoodValue', 1, { kind, faction: factionOf(table, player) }).value;
}

/** The planets a player holds that are ready: those that can pay. */
export function readyPlanets(board: Board, player: PlayerId): PlanetId[] {
  return planetsOf(board, player).filter(id => !board.planets[id].exhausted);
}

/** The planets a player can still spend: their own and not exhausted, and the planet cards they hold and have not exhausted. */
export const payingPlanets = (_table: Table, board: Board, _pack: DataPack, player: PlayerId): PlanetId[] => [
  ...Object.keys(board.planets).filter(id => board.planets[id].owner === player && !board.planets[id].exhausted),
  ...Object.keys(PLANET_CARDS).filter(id => { const held = board.players[player]?.cards[id]; return held !== undefined && held.state !== 'purged' && held.state !== 'exhausted'; }),
];

/** The wormhole tokens of the board as the links read them: the token's type, then the slot. */
const tokenSlots = (board: Board): Record<string, string> =>
  Object.fromEntries(Object.entries(board.common.wormholeTokens).flatMap(([slot, types]) => types.map((type): [string, string] => [type, slot])));

/** The map as the player moves on it: the table's map and the open Fracture, with the faction of the mover (their ships' printed speeds). */
export const mapOf = (table: Table, board: Board, player: PlayerId): ReturnType<typeof mapSource> => ({ ...mapSource(table, board), faction: factionOf(table, player) });

/**
 * What the route checks read of the mover on the board: their command tokens, the components that answer for them and
 * the view of a ship's move they are asked with (the components the entry names, the links they and the tokens make,
 * where the mover's home lies, the wormhole tokens, their docks).
 */
export function routeReadsOn(table: Table, board: Board, pack: DataPack, player: PlayerId, entry: TacticalEntry): RouteReads {
  const map = mapOf(table, board, player);
  const holder = holderIn(table, board, player);
  const named = playedBy(entry);
  const tokens = tokenSlots(board);
  const links = linksFrom(map, pack, { holder, faction: map.faction, controls: id => ownerOf(board, id) === player, tokens, named, during: 'tactical' });
  const at: MoveAt = {
    map, tokens,
    get home() { return homeOf(table, table.players.find(p => p.id === player)!, pack)?.slot ?? null; },
    dockIn: slot => planetsIn(table, board, pack, slot).some(id => ownerOf(board, id) === player && (board.planets[id].structures.spacedock ?? 0) > 0),
  };
  return {
    tokenAt: slot => board.systems[slot]?.tokens.includes(player) ?? false, holder,
    view: (move: Move, unit) => ({ holder, from: move.from, target: entry.systemId ?? undefined, unit, group: move.units, named, links, at }),
  };
}

/** The systems where a player is present: units in space or on a planet, or a planet they control (60). */
function presenceIn(table: Table, board: Board, pack: DataPack, player: PlayerId): Set<Slot> {
  const slots = new Set<Slot>();
  const holds = (units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);
  for (const slot of systemSlots(mapSource(table, board))) {
    if (holds(shipsIn(board, slot, player))) slots.add(slot);
    if (planetsIn(table, board, pack, slot).some(id => holds(groundOn(board, id, player)) || ownerOf(board, id) === player)) slots.add(slot);
  }
  return slots;
}

/** Whether two players are neighbours as the board stands: one is in a system or next to a system the other is in (60, 94.1). The components that change the links are asked. */
export function areNeighbours(table: Table, board: Board, pack: DataPack, a: PlayerId, b: PlayerId): boolean {
  if (!table.players.some(p => p.id === b)) return false;
  const links = linksFrom(mapSource(table, board), pack, {
    holder: holderIn(table, board, a), faction: factionOf(table, a), controls: id => ownerOf(board, id) === a, tokens: tokenSlots(board), during: 'neighbors',
  });
  return areNeighborsOf(mapSource(table, board), presenceIn(table, board, pack, a), presenceIn(table, board, pack, b), pack, links);
}

/** The units of each kind a player still has in the reinforcements: the limit less what stands on the board. Fighters and infantry have none (tokens stand in). */
export function reinforcementsOf(board: Board, pack: DataPack, player: PlayerId): Partial<Record<UnitId, number>> {
  const left: Partial<Record<UnitId, number>> = {};
  const onBoard = (unit: UnitId): number => reinforcementCount(board, player, unit);
  for (const unit of Object.keys(pack.units) as UnitId[]) {
    const limit = pack.units[unit]?.limit;
    if (limit === null || limit === undefined || unit === 'fighter' || unit === 'infantry') continue;
    left[unit] = limit - onBoard(unit);
  }
  return left;
}

/** The systems that hold a player's command token. */
export const tokensOnMap = (board: Board, player: PlayerId): Slot[] =>
  Object.keys(board.systems).filter(slot => board.systems[slot].tokens.includes(player)).sort();

/** The unit and structure upgrades a player holds: the technologies that improve something. */
export function upgradesOf(board: Board, pack: DataPack, player: PlayerId): UpgradeId[] {
  return cardsOf(board, player, 'technology')
    .flatMap(card => pack.technologies[card.id.slice('technology:'.length)]?.upgrade ?? [])
    .sort();
}

/** How many of a unit of a player stand on the board, ships and ground forces. */
const reinforcementCount = (board: Board, player: PlayerId, unit: UnitId): number => [
  ...Object.values(board.systems).map(s => s.ships[player]?.[unit] ?? 0),
  ...Object.values(board.planets).map(p => p.ground[player]?.[unit] ?? 0),
].reduce((sum, n) => sum + n, 0);

/** The systems that hold a command token of the player: what stands on the map for the old `tokensOnMap`. */
export const tokensOnMapOf = (board: Board, player: PlayerId): Slot[] => Object.keys(board.systems).filter(slot => board.systems[slot].tokens.includes(player));

/** The command tokens a player gains in the status phase, after what they hold and the entry plays changed them (81.5). */
export const statusTokensFree = (table: Table, board: Board, pack: DataPack, player: PlayerId, entry: Entry): number =>
  statusTokensFreeOf(holderIn(table, board, player), entry, pack);

/** No more tokens than the sixteen of a faction: the pools, and with `onBoard` those on the board (20.3.1). */
export function reinforcementWarnings(board: Board, player: PlayerId, onBoard: boolean, step?: RuleStep): Warning[] {
  const pools = poolsOf(board, player);
  return tokensOverLimit(pools.tactic + pools.fleet + pools.strategy + (onBoard ? tokensOnMapOf(board, player).length : 0), step);
}

/** After the fleet pool shrank: a system holds more ships than it allows (37.3, 81.5.1). */
export function fleetPoolWarnings(table: Table, board: Board, pack: DataPack, player: PlayerId, step?: RuleStep): Warning[] {
  const stacks = stacksOn(table, board, pack, player);
  const limit = stacks.fleet();
  return Object.keys(board.systems).flatMap(systemId => {
    const ships = stacks.fleetOf(stacks.units(systemId), systemId);
    return ships > limit ? [violation('fleetPool', { systemId, ships, fleet: limit }, step)] : [];
  });
}

/** More tokens in the fleet pool than a game effect allows (the `fleetPoolMax` point). */
export function fleetPoolMaxWarnings(table: Table, board: Board, pack: DataPack, player: PlayerId, step: RuleStep = 'status'): Warning[] {
  const limit = appliedOn(table, board, pack, player, 'fleetPoolMax', Number.POSITIVE_INFINITY, { faction: factionOf(table, player) }).value;
  const fleet = poolsOf(board, player).fleet;
  return fleet > limit ? [violation(fleetPoolTokens.code, { fleet, limit }, step)] : [];
}

/** The checks of the pools after a card changed them: tokens past the sixteen, the fleet pool past a law, below the ships standing. */
export function poolChangeWarnings(table: Table, board: Board, pack: DataPack, player: PlayerId, change: Partial<Record<'tactic' | 'fleet' | 'strategy', number>> | undefined, step?: RuleStep): Warning[] {
  const gained = (change?.tactic ?? 0) + (change?.fleet ?? 0) + (change?.strategy ?? 0);
  return [
    ...(gained > 0 ? reinforcementWarnings(board, player, true, step) : []),
    ...((change?.fleet ?? 0) > 0 ? fleetPoolMaxWarnings(table, board, pack, player, step) : []),
    ...((change?.fleet ?? 0) < 0 ? fleetPoolWarnings(table, board, pack, player, step) : []),
  ];
}
