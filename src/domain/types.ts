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
  /** A space station (Thunder's Edge): taken by ships alone, it holds no ground forces and no structures. */
  station?: true;
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
  /** Fracture systems only: a printed egress, adjacent to each ingress (Thunder's Edge, The Fracture 5). */
  egress?: true;
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
  /** Reinforcement limit, the figures of one colour (LRR 96.2); null for fighters and infantry, which tokens make unlimited. */
  limit: number | null;
  /** Ships and infantry: the base table's levels; a faction's `ships` entry replaces them. */
  levels?: ShipLevels;
}

export interface TechDef { id: string; name: string; type: TechType; }

/** Where a component comes from; shown on it. */
export type ComponentPack = 'base' | 'pok' | 'te';
export type LeaderType = 'agent' | 'commander' | 'hero';
export interface SheetItem {
  /** Source id: the key of the retelling in `sheetSummaries`. */
  id: string;
  name: string;
  pack: ComponentPack;
  /** The id of the item this one takes the place of when its expansion is on. */
  replaces?: string;
}
export interface SheetLeader extends SheetItem { type: LeaderType; title?: string }
export interface SheetMech extends SheetItem {
  cost: number | null;
  combat: number | null;
  dice: number;
  sustain?: true;
}
/** What is printed about a faction beyond its ships, each with its origin. */
export interface FactionSheet {
  abilities: SheetItem[];
  leaders: SheetLeader[];
  mechs: SheetMech[];
  breakthrough?: SheetItem;
}

export interface FactionDef {
  /** Abilities, leaders, mechs and the breakthrough, before the expansions choose among them. */
  sheet?: FactionSheet;
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
  structures: StructureDef[];
}

/** A structure's numbers at one level, from the source. */
export interface StructureStats {
  /** Source id. */
  id: string;
  name: string;
  /** Space docks: the Production value is the planet's resources plus this (LRR 79.1). */
  production?: number;
  cannon?: UnitRoll;
}

export interface StructureDef {
  id: StructureKind;
  /** Reinforcement limit, the figures of one colour (LRR 96.2). */
  limit: number | null;
  levels: { one: StructureStats; two?: StructureStats };
}

export type EntryStatus = 'planned' | 'done' | 'cancelled';
export type Phase = 'strategy' | 'action' | 'status' | 'agenda';

/** `planets` is ordered by descending value, then id. */
export interface Payment { planets: string[]; tradeGoods: number; }

export type StructureKind = 'pds' | 'spacedock';

export interface AdjustmentDelta {
  tradeGoods?: number;
  tactic?: number;
  fleet?: number;
  strategy?: number;
  vp?: number;
  /** Signed. */
  units?: { systemId: string; units: UnitCounts };
  /** Ground units by planet id; signed. */
  ground?: Record<string, UnitCounts>;
}

/** What made an adjustment: the big hex merges its taps into one entry per system. Absent for one made by hand. */
export type AdjustmentKind = 'losses' | 'build' | 'setup';

/** What a strategy card did. Only tokens, payment, readied planets, Mecatol, production and structures reach the projection; the rest is shown. */
export interface CardEffects {
  /** Token distribution, signed: Warfare's rearrangement takes from a pool. Bought tokens count only once distributed. */
  tokens?: { tactic?: number; fleet?: number; strategy?: number };
  /** Bought with influence on Leadership. */
  boughtTokens?: number;
  /** Technology's technologies other than ship upgrades, which the app counts and does not name. */
  researched?: number;
  /** The chosen system. */
  systemId?: string;
  /** Planet ids. */
  readied?: string[];
  /** Opponent id. */
  speaker?: string;
  /** Opponent ids. */
  freeSecondary?: string[];
  mecatol?: boolean;
  /** `ground` holds where ground units of `units` were bought, by planet id; what is not listed goes to the first planet I control. */
  production?: { systemId: string; units: UnitCounts; ground?: Record<string, UnitCounts> };
  /** One item per structure. */
  structures?: { kind: StructureKind; planetId: string }[];
  payment?: Payment;
}

/** A strategy card played: all optional, so entries saved before need no migration. */
export interface CardPlay {
  /** Ships upgraded by this entry, as with research. */
  upgrades?: UnitId[];
  /** Initiative number. */
  card?: number;
  /** A primary played for a strategy token, as some faction abilities allow. */
  forToken?: boolean;
  effects?: CardEffects;
}

/**
 * `systemId` is a `Game.map` slot key. A tactical entry's `moves` carry units from `from`
 * (a slot key, or a planet id to pick ground units up) into `systemId`. The route of a source is held by the move
 * whose `from` is that source: `via` lists the slots on the way, in flight order. A move with `pickupOf` takes units
 * on board on the way: it joins the group of that source slot.
 */
export type EntryBody =
  | { type: 'tactical'; systemId: string | null; moves: { from: string; units: UnitCounts; via?: string[]; pickupOf?: string }[];
      landings: { planetId: string; units: UnitCounts }[]; production: UnitCounts; payment: Payment;
      /** What the battle in the active system cost me: gone after the moves, before the landing and the production. */ losses?: UnitCounts;
      /** What the battle cost on planets, by planet id: gone after the landing. */ groundLosses?: Record<string, UnitCounts>;
      /** Where the ground units of `production` were bought, by planet id; what is not listed goes to the first planet I control. */ productionGround?: Record<string, UnitCounts>;
      /** Warfare's primary in Thunder's Edge: no tactic token is spent and no command token goes down. */ free?: boolean;
      /** The id of the card entry that started this action: it goes when that entry goes. */ fromCard?: string }
  | ({ type: 'strategic' } & CardPlay)
  | ({ type: 'secondary' } & CardPlay)
  | { type: 'component'; note: string }
  | { type: 'pass' }
  | { type: 'expedition'; sliceId: string | null; payment: Payment }
  | { type: 'adjustment'; label: string; delta: AdjustmentDelta; kind?: AdjustmentKind }
  | { type: 'statusTokens'; tactic: number; fleet: number; strategy: number;
      /** My points gained this round. */ vp?: number;
      /** Opponent id to the points they gained this round. */ opponentVp?: Record<string, number> };

export type Entry = EntryBody & { id: string; phase: Phase; status: EntryStatus;
  /** The opponent this is expected of; without it the entry is mine. */ owner?: string };

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
  /** What the player calls this game; a link finds its save by this. */
  name?: string;
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
  /** Starting victory points; the status entries and adjustments of a plan add to it. */
  vp: number;
  /** Slot key to `<tileId>` or `<tileId>@<rotation 0-5>`. Slot keys are the system ids used everywhere else. */
  map: Record<string, string>;
  opponents: Opponent[];
  /** Set by hand. `me` is the baseline, such as starting technology; entries of a plan add to it. Opponents have no plan. */
  upgrades: { me: UnitId[]; opponents: Record<string, UnitId[]> };
  /** Slot key to opponent id to that opponent's units in space; ground units only in a system without planets. */
  enemyUnits: Record<string, Record<string, UnitCounts>>;
  /** Planet id to opponent id to that opponent's ground units there. */
  enemyGround: Record<string, Record<string, UnitCounts>>;
  planetControl: Record<string, 'me' | 'enemy'>;
  /** Planet id to opponent id, only for enemy planets. An enemy planet with no owner belongs to the first opponent. */
  planetOwner: Record<string, string>;
  // TODO(P2-024) #ws:structures #type:model #rule:49.5.1 #rule:63.4 #rule:79.4 #test:049-invasion #test:063-pds #test:079-space-dock #size:l #structure-owner #schema — У баз и PDS нет владельца: при захвате планеты чужие строения переходят к захватчику вместо уничтожения. Хранить владельца, уничтожать при смене контроля, миграция схемы
  /** Ids of planets that have a space dock. */
  docks: string[];
  /** Planet id to the number of PDS on it. */
  pds: Record<string, number>;
  expedition: { slices: Record<string, 'me' | 'other' | null>; thundersEdgeSystem: string | null };
  fracture: { active: boolean; ingress: string[]; /** Chosen seat (1 is at the top, then clockwise); null puts the group at the default edge. */ seat: number | null;
    /** While open: slot key beside the map to its Fracture tile, so ships fly there like to any system. Absent in games saved earlier, until their next opening. */ tiles?: Record<string, string> };
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
  /** Each opponent's starting points plus their gains in the status entries replayed so far, by opponent id. */
  opponentVp: Record<string, number>;
  /** The baseline plus the upgrades of the entries replayed so far. */
  upgrades: UnitId[];
  /** The game's space docks plus those built by the entries replayed so far. */
  docks: string[];
  /** Planet id to PDS count, the same way. */
  pds: Record<string, number>;
  /** Each opponent counted the same way, from what stands on the map for them and their entries replayed so far. */
  rivals?: Record<string, GameState>;
  /** Planet id to the opponent whose entries landed there, ahead of the owner set by hand. */
  rivalHolds?: Record<string, string>;
}

/** Every warning the replay can give; the rule registry (src/domain/rules/registry.ts) maps each to its rules and step. */
export const WARNING_CODES = ['shortResources', 'shortInfluence', 'shortTradeGoods', 'planetExhausted',
  'capacityGroup', 'capacitySystem', 'fleetPool', 'unitsMissing', 'landingOverLimit',
  'sliceTaken', 'shortStrategy', 'primaryRepeated', 'tokensOver', 'poolNegative', 'systemHasToken', 'constructionUnits', 'speedShort', 'routeBlocked', 'sourceActivated',
  // production, thunders-edge
  'noProduction', 'productionBlockaded', 'blockaded', 'productionOver', 'reinforcementsOut', 'productionPlace', 'scarProduction',
  'expeditionUnpaid', 'expeditionTwicePerTurn', 'stationGround', 'stationStructure'] as const;
export type WarningCode = (typeof WARNING_CODES)[number];
/** The part of a round or of a tactical action (89.1-89.5) a violation comes from. */
export type RuleStep = 'activation' | 'movement' | 'transport' | 'combat' | 'invasion' | 'production' | 'payment' | 'card' | 'status' | 'round' | 'expedition';
/** Where a violation arose: the entry, and within it the source system or the planet when there is one. */
export interface ViolationPlace { entryId: string; source?: string; planetId?: string }
/**
 * A rule the plan breaks; it forbids nothing. The replay gives `rule` (LRR number as in the rules tests' names), `step` and `place`;
 * a warning written by hand (tests) may lack them.
 */
export interface Warning {
  code: WarningCode;
  params: Record<string, string | number>;
  readonly rule?: string;
  readonly step?: RuleStep;
  readonly place?: ViolationPlace;
}
export type Projection = { state: GameState; warningsByEntry: Record<string, Warning[]> };
