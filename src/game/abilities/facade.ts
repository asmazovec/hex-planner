/**
 * The small read facade a component file uses: `my` and `of(player)` answer in the words of the game (pools, goods,
 * cards with their state, planets with their values, units, structures, laws, objectives), built only on the queries of
 * the kernel. Nothing here counts a rule or changes a board.
 */
import { componentById } from '../../domain/components';
import type { PlanetDef, StructureCounts, UnitCounts } from '../../domain/types';
import { cardsOf, groundOn, planetsOf, poolsOf, shipsIn, type HeldCard } from '../queries';
import type { Board, CardState, ComponentId, DataPack, LawInForce, PlanetId, PlayerId, Pools, Slot, Table } from '../types';

export interface PlanetRead {
  id: PlanetId;
  resources: number;
  influence: number;
  exhausted: boolean;
  structures: StructureCounts;
  attached: ComponentId[];
  /** This player's ground forces on it. */
  ground: UnitCounts;
}

export interface Reader {
  readonly player: PlayerId;
  readonly faction: string;
  readonly pools: Pools;
  readonly tradeGoods: number;
  readonly commodities: number;
  readonly vp: number;
  /** What the player holds, by kind when given; purged cards are not held. */
  cards(kind?: string): HeldCard[];
  /** The state of a held card; none when it is not held. */
  card(id: ComponentId): CardState | undefined;
  holds(id: ComponentId): boolean;
  /** The planets the player controls. */
  planets(): PlanetRead[];
  /** The player's units in a system's space area, or on a planet. */
  unitsIn(slot: Slot): UnitCounts;
  unitsOn(planet: PlanetId): UnitCounts;
  /** The structures on the player's planets. */
  structures(): { planet: PlanetId; structures: StructureCounts }[];
  /** Whether the player stands in a system: ships in its space, ground forces or a structure on its planets there. */
  standsIn(slot: Slot, planets: readonly PlanetId[]): boolean;
}

export interface Shared {
  laws(): LawInForce[];
  /** The public objectives revealed, and whether the player scored each. */
  objectives(): ComponentId[];
  scored(player: PlayerId, id: ComponentId): boolean;
}

const any = (units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);

export function readerOf(table: Table, board: Board, pack: DataPack, player: PlayerId): Reader {
  const state = board.players[player];
  const planet = (id: PlanetId): PlanetRead => {
    const def: Partial<PlanetDef> = pack.planets[id] ?? {};
    const held = board.planets[id];
    return { id, resources: def.resources ?? 0, influence: def.influence ?? 0, exhausted: held?.exhausted ?? false, structures: held?.structures ?? {}, attached: held?.attached ?? [], ground: groundOn(board, id, player) };
  };
  return {
    player, faction: table.players.find(p => p.id === player)?.faction ?? '',
    pools: poolsOf(board, player), tradeGoods: state?.tradeGoods ?? 0, commodities: state?.commodities ?? 0, vp: state?.vp ?? 0,
    cards: kind => cardsOf(board, player, kind),
    card: id => (state?.cards[id]?.state === 'purged' ? undefined : state?.cards[id]?.state),
    holds: id => state?.cards[id] !== undefined && state.cards[id].state !== 'purged',
    planets: () => planetsOf(board, player).map(planet),
    unitsIn: slot => shipsIn(board, slot, player),
    unitsOn: id => groundOn(board, id, player),
    structures: () => planetsOf(board, player).flatMap(id => (Object.keys(board.planets[id].structures).length > 0 ? [{ planet: id, structures: board.planets[id].structures }] : [])),
    standsIn: (slot, planets) => any(shipsIn(board, slot, player)) || planets.some(id => any(groundOn(board, id, player)) || board.planets[id]?.owner === player),
  };
}

export function sharedOf(board: Board, pack: DataPack): Shared {
  return {
    laws: () => board.common.laws,
    objectives: () => board.common.revealed.filter(id => componentById(pack, id)?.kind === 'publicObjective'),
    scored: (player, id) => board.players[player]?.cards[id]?.state === 'inPlay',
  };
}
