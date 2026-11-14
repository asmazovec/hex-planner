/**
 * What the interface reads in place of the old per-player state: one typed read model of a player and of the table,
 * built only from the board, the table and the data pack, through the queries. Nothing here counts a rule: the values of
 * a planet are the printed ones (what a component changes them to is `queries.planetValue`).
 */
import { componentById } from '../domain/components';
import type { PlanetDef, StructureCounts, UnitCounts } from '../domain/types';
import { cardsOf, groundOn, planetsOf, poolsOf, shipsIn, tokensOnMap, type HeldCard } from './queries';
import type { Board, ComponentId, DataPack, LawInForce, PlanetId, PlayerId, Pools, Slot, Table } from './types';

export interface PlanetView {
  id: PlanetId;
  name: string;
  resources: number;
  influence: number;
  /** Ready to pay with: held and not exhausted. */
  ready: boolean;
  structures: StructureCounts;
  attached: ComponentId[];
  /** This player's ground forces on it. */
  ground: UnitCounts;
}

export type CardKind = 'technology' | 'actionCard' | 'relic' | 'promissory' | 'secretObjective' | 'publicObjective' | 'exploration' | 'leader' | 'breakthrough';

export interface PlayerView {
  id: PlayerId;
  faction: string;
  seat: number;
  pools: Pools;
  tradeGoods: number;
  commodities: number;
  vp: number;
  passed: boolean;
  planets: PlanetView[];
  /** Units in the space area, by system. */
  ships: Record<Slot, UnitCounts>;
  /** Structures carried in the space area, by system. */
  afloat: Record<Slot, StructureCounts>;
  /** Where the command tokens lie. */
  tokensOnMap: Slot[];
  /** What the player holds, by the kind of the component. */
  cards: Partial<Record<CardKind, HeldCard[]>>;
  strategy: { card: number; played: boolean }[];
}

export interface TableView {
  round: number;
  phase: string;
  speaker: PlayerId;
  active?: PlayerId;
  viewer: PlayerId;
  players: PlayerView[];
  laws: LawInForce[];
  /** The public objectives revealed, each with the players who scored it. */
  objectives: { id: ComponentId; scoredBy: PlayerId[] }[];
  custodians: boolean;
  expedition: Record<string, PlayerId>;
  fracture: { open: boolean; tiles: Record<Slot, string> };
  wormholeTokens: Record<Slot, string[]>;
}

const KINDS: CardKind[] = ['technology', 'actionCard', 'relic', 'promissory', 'secretObjective', 'publicObjective', 'exploration', 'leader', 'breakthrough'];

function planetView(board: Board, pack: DataPack, player: PlayerId, id: PlanetId): PlanetView {
  const def: Partial<PlanetDef> = pack.planets[id] ?? {};
  const state = board.planets[id];
  return {
    id, name: def.name ?? id, resources: def.resources ?? 0, influence: def.influence ?? 0, ready: !(state?.exhausted ?? false),
    structures: state?.structures ?? {}, attached: state?.attached ?? [], ground: groundOn(board, id, player),
  };
}

/** One player as the board has them. */
export function playerView(table: Table, board: Board, pack: DataPack, player: PlayerId): PlayerView {
  const p = table.players.find(x => x.id === player);
  const state = board.players[player];
  const cards: PlayerView['cards'] = {};
  for (const kind of KINDS) {
    const held = cardsOf(board, player, kind);
    if (held.length > 0) cards[kind] = held;
  }
  const slots = Object.keys(board.systems);
  return {
    id: player, faction: p?.faction ?? '', seat: p?.seat ?? 0, pools: poolsOf(board, player),
    tradeGoods: state?.tradeGoods ?? 0, commodities: state?.commodities ?? 0, vp: state?.vp ?? 0, passed: state?.passed ?? false,
    planets: planetsOf(board, player).map(id => planetView(board, pack, player, id)),
    ships: Object.fromEntries(slots.filter(s => Object.keys(shipsIn(board, s, player)).length > 0).map(s => [s, shipsIn(board, s, player)])),
    afloat: Object.fromEntries(slots.filter(s => Object.keys(board.systems[s].afloat[player] ?? {}).length > 0).map(s => [s, board.systems[s].afloat[player]])),
    tokensOnMap: tokensOnMap(board, player), cards, strategy: state?.strategy ?? [],
  };
}

/** The whole table as the board has it: every player, the laws, the objectives and what the game shares. */
export function tableView(table: Table, board: Board, pack: DataPack): TableView {
  const players = table.players.map(p => playerView(table, board, pack, p.id));
  const scored = (id: ComponentId): PlayerId[] => table.players.filter(p => board.players[p.id]?.cards[id]?.state === 'inPlay').map(p => p.id);
  return {
    round: board.round, phase: board.phase, speaker: board.speaker, ...(board.active === undefined ? {} : { active: board.active }), viewer: table.viewer,
    players, laws: board.common.laws,
    objectives: board.common.revealed.filter(id => componentById(pack, id)?.kind === 'publicObjective').map(id => ({ id, scoredBy: scored(id) })),
    custodians: board.common.custodians, expedition: board.common.expedition, fracture: board.common.fracture, wormholeTokens: board.common.wormholeTokens,
  };
}

/** The table through one player's eyes: their own view, the others', and the table. */
export function seenBy(table: Table, board: Board, pack: DataPack, player: PlayerId): { me: PlayerView; others: PlayerView[]; table: TableView } {
  const view = tableView(table, board, pack);
  return { me: view.players.find(p => p.id === player) ?? playerView(table, board, pack, player), others: view.players.filter(p => p.id !== player), table: view };
}
