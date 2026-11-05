export type ExpansionId = 'pok' | 'te';

export type UnitId = 'carrier' | 'cruiser' | 'destroyer' | 'dreadnought' | 'warsun'
  | 'flagship' | 'fighter' | 'infantry' | 'mech';
export type UnitCounts = Partial<Record<UnitId, number>>;

export type TechType = 'propulsion' | 'biotic' | 'cybernetic' | 'warfare';

export type PlanetTrait = 'cultural' | 'hazardous' | 'industrial';

export interface PlanetDef {
  id: string;
  name: string;
  resources: number;
  influence: number;
  /** Technology specialties; absent means none. */
  tech?: TechType[];
  /** Technology skip: of a unit upgrade or of another technology; absent means none. */
  skip?: 'unit' | 'nonUnit';
  /** Planet traits; absent for a home planet, Mecatol or a station. */
  traits?: PlanetTrait[];
  /** English name of the legendary planet ability; absent for an ordinary planet. */
  legendary?: string;
}

export type Anomaly = 'asteroid' | 'nebula' | 'supernova' | 'rift' | 'scar';

export interface TileDef {
  id: string;
  /** Printed number; a double-sided tile shares it between its ids (83A, 83B). Fracture tiles hold source ids: their printed numbers are unconfirmed. */
  number: string;
  planetIds: string[];
  kind: 'system' | 'home' | 'hyperlane' | 'fracture';
  anomaly?: Anomaly;
  /** Only tile 117 (The Watchtower) has two anomalies. */
  secondAnomaly?: Anomaly;
  wormholes: string[];
  /** Hyperlanes only: pairs of tile edges the lanes join, edge 0 at the top and numbered clockwise, before any rotation. */
  lanes?: [number, number][];
}

/** A roll of a unit ability: hits on `hit`, with `dice` dice. */
export interface UnitRoll { hit: number; dice: number; }

/** A ship's numbers at one level, from the source. The properties are shown only and never calculated. */
export interface ShipStats {
  /** Source id: the key of the retelling in `shipSummaries`. */
  id: string;
  name: string;
  cost: number;
  capacity: number;
  combat: number | null;
  /** Combat dice. 0 where the source counts them in play (Winnu flagship). */
  dice: number;
  move: number | null;
  sustain?: true;
  barrage?: UnitRoll;
  bombard?: UnitRoll;
  cannon?: UnitRoll;
}

export interface ShipLevels { one: ShipStats; two?: ShipStats; }

export interface UnitDef {
  id: UnitId;
  name: string;
  /** Cost per unit: a fighter or infantry costs 0.5, because 1 resource produces 2. */
  cost: number;
  capacity: number;
  /** From the source, where ships also have 1: capacity checks must count only `fighter` and `ground` units. */
  capacityUsed: number;
  ground: boolean;
  fighter: boolean;
  /** Combat value of the base unit; null when it has none. */
  combat: number | null;
  /** Null when the unit cannot move on its own. */
  move: number | null;
  /** Reinforcement limit; null means not confirmed or without a limit. */
  limit: number | null;
  /** Ships only: the base table's levels; a faction's `ships` entry replaces them. */
  levels?: ShipLevels;
}

export interface TechDef { id: string; name: string; type: TechType; }

export interface FactionDef {
  id: string;
  name: string;
  /** Tile holding the home planets, where the starting units begin. */
  homeTile: string;
  startUnits: UnitCounts;
  /** Technology ids the faction always starts with. */
  startingTech: string[];
  /** The faction chooses this many at setup; no options means any. */
  startingTechChoice?: { amount: number; options: string[] };
  commodities: number;
  /** Ability names only. */
  abilities: string[];
  /** The tile that stands on the map when the home planets lie on an off-map tile. */
  gateTile?: string;
  /** The faction's own ships: each replaces the base entry of its type. */
  ships?: Partial<Record<UnitId, ShipLevels>>;
}

/** `standard` has no hyperlane tiles; `hyperlanes` has them at fixed slots (the rules' own layout for five players). */
export type MapLayout = 'standard' | 'hyperlanes';

export interface MapTemplate {
  playerCount: number;
  layout: MapLayout;
  /** Slot keys of the home systems in seat order: seat 1 at the top, then clockwise. */
  homes?: string[];
  /**
   * Axial coordinates of a flat-top hex grid: north is r - 1, north-east is q + 1, r - 1.
   * `fixed` uses the Game.map format, `<tileId>` or `<tileId>@<rotation 0-5>`; one rotation step is 60 degrees clockwise.
   */
  slots: { q: number; r: number; fixed?: string }[];
}

export interface DataPack {
  version: string;
  tiles: Record<string, TileDef>;
  planets: Record<string, PlanetDef>;
  /** `mech` is absent unless Prophecy of Kings is on. */
  units: Partial<Record<UnitId, UnitDef>>;
  factions: Record<string, FactionDef>;
  templates: MapTemplate[];
  technologies: Record<string, TechDef>;
  structures: { id: 'pds' | 'spacedock'; limit: number | null }[];
}

export type EntryStatus = 'planned' | 'done' | 'cancelled';
export type Phase = 'strategy' | 'action' | 'status' | 'agenda';

/** `planets` is ordered by descending value, then id. */
export interface Payment { planets: string[]; tradeGoods: number; }

export interface AdjustmentDelta {
  tradeGoods?: number;
  tactic?: number;
  fleet?: number;
  strategy?: number;
  vp?: number;
  units?: { systemId: string; units: UnitCounts };
}

/**
 * `systemId` is a `Game.map` slot key. A tactical entry's `moves` carry units from `from`
 * (a slot key, or a planet id to pick ground units up) into `systemId`.
 */
export type EntryBody =
  | { type: 'tactical'; systemId: string | null; moves: { from: string; units: UnitCounts }[];
      landings: { planetId: string; units: UnitCounts }[]; production: UnitCounts; payment: Payment }
  | { type: 'strategic'; /** Ships upgraded by this entry, as with research. */ upgrades?: UnitId[] }
  | { type: 'secondary'; upgrades?: UnitId[] }
  | { type: 'component'; note: string }
  | { type: 'pass' }
  | { type: 'expedition'; sliceId: string | null; payment: Payment }
  | { type: 'adjustment'; label: string; delta: AdjustmentDelta }
  | { type: 'statusTokens'; tactic: number; fleet: number; strategy: number };

export type Entry = EntryBody & { id: string; phase: Phase; status: EntryStatus };

export interface Round { number: number; strategyCard: number | null; backupCard: number | null; entries: Entry[]; }
export interface Plan { id: string; name: string; rounds: Round[]; }

export interface Opponent {
  /** Stable: survives seat swaps, faction changes and the removal of other opponents. */
  id: string;
  faction: string;
  vp: number;
  seat: number;
  color: number;
}

export interface Game {
  id: string;
  schemaVersion: number;
  dataVersion: string;
  expansions: ExpansionId[];
  playerCount: number;
  /** Which map template of the player count is in use. */
  layout: MapLayout;
  faction: string;
  /** Your seat: 1 at the top of the map, then clockwise. Seats of all players are a permutation of 1..playerCount. */
  seat: number;
  /** Number of your player colour, 1 to 8: `--player-<n>` in the theme. */
  color: number;
  /** Victory points set by hand; adjustments in the plan add to it. */
  vp: number;
  /** Slot key to `<tileId>` or `<tileId>@<rotation 0-5>`. Slot keys are the system ids used everywhere else. */
  map: Record<string, string>;
  opponents: Opponent[];
  /** Set by hand. `me` is the baseline, such as starting technology; entries of a plan add to it. Opponents have no plan. */
  upgrades: { me: UnitId[]; opponents: Record<string, UnitId[]> };
  /** Slot key to opponent id to that opponent's units. */
  enemyUnits: Record<string, Record<string, UnitCounts>>;
  planetControl: Record<string, 'me' | 'enemy'>;
  /** Planet id to opponent id, only for enemy planets. An enemy planet with no owner belongs to the first opponent. */
  planetOwner: Record<string, string>;
  /** Ids of planets that have a space dock. */
  docks: string[];
  expedition: { slices: Record<string, 'me' | 'other' | null>; thundersEdgeSystem: string | null };
  fracture: { active: boolean; ingress: string[]; /** Chosen seat (1 is at the top, then clockwise); null puts the group at the default edge. */ seat: number | null };
  plans: Plan[];
  activePlanId: string;
}

export interface GameState {
  /** The player's units in each system's space, by slot key. */
  systems: Record<string, UnitCounts>;
  /** The player's ground units on each planet, by planet id. */
  ground: Record<string, UnitCounts>;
  exhausted: string[];
  control: Record<string, 'me' | 'enemy'>;
  tokensOnMap: string[];
  tradeGoods: number;
  tactic: number;
  fleet: number;
  strategy: number;
  vp: number;
  /** The baseline plus the upgrades of the entries replayed so far. */
  upgrades: UnitId[];
}

export type WarningCode = 'shortResources' | 'shortInfluence' | 'shortTradeGoods' | 'planetExhausted'
  | 'capacityGroup' | 'capacitySystem' | 'fleetPool' | 'unitsMissing' | 'landingOverLimit'
  | 'sliceTaken';
export interface Warning { code: WarningCode; params: Record<string, string | number>; }
export type Projection = { state: GameState; warningsByEntry: Record<string, Warning[]> };
