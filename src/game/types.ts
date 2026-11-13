/**
 * The vocabulary of the game kernel: what a table is, and what a board holds. A board is plain JSON (records, arrays,
 * numbers, strings, no Map or Set) so that it can be saved, compared with `toEqual` and shared structurally.
 * Leaf types that the data pack already defines are imported, not copied.
 */
import type { DataPack, ExpansionId, MapLayout, Phase, StructureCounts, UnitCounts } from '../domain/types';

export type { DataPack, ExpansionId, MapLayout, Phase, StructureCounts, UnitCounts };
export type { RuleStep, StructureKind, UnitId } from '../domain/types';

/** `p1`..`p8` by seat; stable for the whole game, whoever sits where. */
export type PlayerId = string;
/** `q,r` of a map slot, or the tile id of an off-map home (Creuss). */
export type Slot = string;
export type PlanetId = string;
/** `<kind>:<source id>` as the component catalogue has it; a promissory note carries its owner, `promissory:<id>@<player>`. */
export type ComponentId = string;
/** `<tile id>` or `<tile id>@<rotation 0-5>`, as in the saved game's map. */
export type TileRef = string;

/** A player's choices at setup that the faction sheet leaves open. */
export interface SetupChoices {
  /** The starting technologies chosen beyond the fixed ones, as component ids. */
  technologies?: ComponentId[];
  /** The home planet the starting structures stand on; the first home planet when absent. */
  structurePlanet?: PlanetId;
}

export interface Player {
  id: PlayerId;
  /** Faction id; empty while the player has none. */
  faction: string;
  seat: number;
  color: number;
  setup: SetupChoices;
  /** Migration only: the id this player has in the old model (`me` or an opponent id). Goes with the old code. */
  legacyId?: string;
}

/** What does not change during a game. */
export interface Table {
  id: string;
  name: string;
  expansions: ExpansionId[];
  layout: MapLayout;
  map: Record<Slot, TileRef>;
  /** In seat order. */
  players: Player[];
  /** Whose eyes the interface looks through. */
  viewer: PlayerId;
}

/** `ready` is the normal state; `locked` is a leader not yet unlocked; `inPlay` a card kept face up (a scored objective, a note played). */
export type CardState = 'ready' | 'exhausted' | 'locked' | 'purged' | 'inPlay';
/** A held card with its state; `count` is above 1 only for what comes in copies (action cards, relic fragments). */
export interface CardHold {
  state: CardState;
  count: number;
  /** What stands on the component's own card: units placed on it, a technology it carries (Nekro, the Ghosts of Creuss and the like). */
  onCard?: { units: UnitCounts; technologies: ComponentId[] };
}

export interface Pools { tactic: number; fleet: number; strategy: number }

export interface PlayerState {
  pools: Pools;
  tradeGoods: number;
  commodities: number;
  vp: number;
  cards: Record<ComponentId, CardHold>;
  /** The strategy cards picked this round, by initiative number. */
  strategy: { card: number; played: boolean }[];
  passed: boolean;
}

export interface SystemState {
  /** Units in the space area by owner; ground forces only where the system has no planet to hold them. */
  ships: Record<PlayerId, UnitCounts>;
  /** Players whose command token lies in the system. */
  tokens: PlayerId[];
  /** Structures in the space area, carried and not put on a planet yet. */
  afloat: Record<PlayerId, StructureCounts>;
}

export interface PlanetState {
  owner?: PlayerId;
  exhausted: boolean;
  ground: Record<PlayerId, UnitCounts>;
  /** The owner's: a structure has no owner of its own, so a planet that changes hands loses them. */
  structures: StructureCounts;
  attached: ComponentId[];
}

export interface LawInForce { id: ComponentId; /** The player an `Elect Player` law binds. */ elected?: PlayerId }

export interface CommonState {
  laws: LawInForce[];
  revealed: ComponentId[];
  custodians: boolean;
  /** Expedition slice id to the player who took it. */
  expedition: Record<string, PlayerId>;
  /** Fracture systems by slot, once it is open. */
  fracture: { open: boolean; tiles: Record<Slot, TileRef> };
  /** Wormhole tokens by system. */
  wormholeTokens: Record<Slot, string[]>;
  /** The system the Thunder's Edge slot holds, once it is set. */
  thundersEdge?: Slot;
  /** Anomaly tokens by system (the tokens beyond what the tile itself shows). */
  anomalyTokens?: Record<Slot, string[]>;
}

export interface Board {
  round: number;
  phase: Phase;
  speaker: PlayerId;
  /** Whose turn it is, in the action phase. */
  active?: PlayerId;
  players: Record<PlayerId, PlayerState>;
  /** Only the systems something has happened in. */
  systems: Record<Slot, SystemState>;
  /** Only the planets someone has held, or that something is attached to. */
  planets: Record<PlanetId, PlanetState>;
  common: CommonState;
}
