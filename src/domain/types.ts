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
  /** Legendary planets only: the expansion the planet comes from. The ability's text is that of `legendary:<id>`. */
  pack?: ComponentPack;
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
  /** Source id; the printed ability, when the ship has one, is the text `unit:<id>`. */
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

export interface TechDef {
  id: string;
  name: string;
  /** Null for a unit upgrade and for a faction card with no colour (Valefar Assimilator). */
  type: TechType | null;
  /** Prerequisites, how many of each colour; absent when there are none. */
  requires?: Partial<Record<TechType, number>>;
  /** A unit upgrade: the unit or structure it upgrades. Its numbers are in the ship table, not here. */
  upgrade?: UnitId | StructureKind;
  /** The expansion the card comes from; a pack built by hand may leave it out, which reads as the base game. */
  pack?: ComponentPack;
}

/** Where a component comes from; shown on it. */
export type ComponentPack = 'base' | 'pok' | 'te';
export type LeaderType = 'agent' | 'commander' | 'hero';
export interface SheetItem {
  /** Source id; the printed text is that of the component `<kind>:<id>`. */
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
  /** Faction technologies; the details are in the pack's `technologies` under the same id. */
  techs: SheetItem[];
  breakthrough?: SheetItem;
}

export interface FactionDef {
  /** Abilities, leaders, mechs, faction technologies and the breakthrough, before the expansions choose among them. */
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

/**
 * `standard` has no hyperlane tiles; `hyperlanes` has them at fixed slots (the rules' own layout for five and seven
 * players); `alternate` is the Prophecy of Kings appendix's alternate hyperlanes for seven and eight players, with its own
 * ring shapes; `large` is the appendix's Large Galaxy for six players, four full rings.
 */
export type MapLayout = 'standard' | 'hyperlanes' | 'alternate' | 'large';

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
  /** The cards with no home elsewhere in the pack: action cards, agendas, relics, objectives, exploration, promissory notes. */
  components: ComponentDef[];
  /** Printed texts by component id, verbatim from the source or translated, by the language the pack was loaded in (src/data/texts): of `components`, and of technologies, sheet items, legendary planets, ships (`unit:<id>`) and strategy cards (`strategy:<id>`, `strategy:<id>#secondary`). */
  texts: Record<string, string>;
  /** The texts as printed, in English, when `texts` holds their translation; absent when `texts` are the printed ones. The search reads both. */
  originalTexts?: Record<string, string>;
}

export type ComponentKind = 'technology' | 'actionCard' | 'relic' | 'publicObjective' | 'secretObjective' | 'agenda'
  | 'exploration' | 'promissory' | 'leader' | 'ability' | 'breakthrough' | 'mech' | 'legendary';

/** One game component of any kind, as the catalog of `componentsOf` lists it. */
export interface ComponentDef {
  /** Unique among all kinds: `<kind>:<source id>`. */
  id: string;
  kind: ComponentKind;
  /** English name. */
  name: string;
  pack: ComponentPack;
  /** Verbatim from the card, paragraphs split by `
`. */
  text: string;
  /** How many such cards the deck holds; 1 for everything else. */
  copies?: number;
  /** The owning faction: a faction technology, leader, ability, breakthrough, mech, promissory note. */
  faction?: string;
  /** The other factions that own the same card as `faction`: the three Council Keleres variants share their sheet. */
  sharedBy?: string[];
  /** Fields of the kind: an action card's phase and window, an objective's stage and points, an agenda's type and target, an exploration card's trait, a leader's type. */
  detail?: Record<string, string | number>;
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
export type StructureCounts = Partial<Record<StructureKind, number>>;
/** What a unit upgrade technology improves: a ship or ground force, or a structure (PDS II, Space Dock II). */
export type UpgradeId = UnitId | StructureKind;

export interface AdjustmentDelta {
  tradeGoods?: number;
  tactic?: number;
  fleet?: number;
  strategy?: number;
  vp?: number;
  /** Signed. */
  units?: { systemId: string; units: UnitCounts };
  /** Ground forces by planet id; signed. */
  ground?: Record<string, UnitCounts>;
}

/** What made an adjustment: the big hex merges its taps into one entry per system. Absent for one made by hand. */
export type AdjustmentKind = 'losses' | 'build' | 'setup';

/** What the objectives scored in a status phase cost: command tokens from the pools, trade goods, and the planets exhausted for resources and for influence. */
export interface StatusSpend { tactic?: number; fleet?: number; strategy?: number; tradeGoods?: number; resources?: Payment; influence?: Payment }

/** What a strategy card did. Only tokens, payment, readied planets, Mecatol, production and structures reach the projection; the rest is shown. */
export interface CardEffects {
  /** Token distribution, signed: Warfare's rearrangement takes from a pool. Bought tokens count only once distributed. */
  tokens?: { tactic?: number; fleet?: number; strategy?: number };
  /** Bought with influence on Leadership. */
  boughtTokens?: number;
  /** The technologies researched, by component id (`technology:<id>`); a unit upgrade is one of them. */
  researched?: string[];
  /** Planets exhausted for their technology specialty, each to ignore one prerequisite of its colour (90.14). */
  specialties?: string[];
  /** The chosen system. */
  systemId?: string;
  /** Planet ids. */
  readied?: string[];
  /** Opponent id. */
  speaker?: string;
  /** Opponent ids. */
  freeSecondary?: string[];
  mecatol?: boolean;
  /** `ground` holds where ground forces of `units` were bought, by planet id; what is not listed goes to the first planet I control. */
  production?: { systemId: string; units: UnitCounts; ground?: Record<string, UnitCounts> };
  /** One item per structure. */
  structures?: { kind: StructureKind; planetId: string }[];
  payment?: Payment;
}

/** A strategy card played: all optional, an entry starts without a card and takes its parts as they are chosen. */
export interface CardPlay {
  /** Initiative number. */
  card?: number;
  /** A primary played for a strategy token, as some faction abilities allow. */
  forToken?: boolean;
  effects?: CardEffects;
}

/**
 * What one side of a transaction hands over (94.2): trade goods, commodities, and components by id: a promissory
 * note (no more than one, 69.5), an action card where an ability lets it (94.3.1).
 */
export interface Goods { tradeGoods?: number; commodities?: number; components?: string[] }

/** A part of a turn beside its action, done with it: a transaction with a neighbour (94) or an expedition at its end. */
export type Act =
  | { kind: 'expedition'; sliceId: string | null; payment: Payment }
  | { kind: 'transaction'; with: string; give: Goods; get: Goods };

/** The entries that make a player's turn and so can hold acts; a secondary is played in another player's turn. */
export const TURN_TYPES = ['tactical', 'strategic', 'component', 'pass'] as const;

/**
 * `systemId` is a `Game.map` slot key. A tactical entry's `moves` carry units from `from`
 * (a slot key, or a planet id to pick ground forces up) into `systemId`. The route of a source is held by the move
 * whose `from` is that source: `via` lists the slots on the way, in flight order. A move with `pickupOf` takes units
 * on board on the way: it joins the group of that source slot.
 */
export type EntryBody = (
  | { type: 'tactical'; systemId: string | null;
      moves: { from: string; units: UnitCounts; via?: string[]; pickupOf?: string;
        /** Structures taken on board with the units: from a planet (`from` is its id) or from the space area of a system. The rules forbid it (85.3); a component may lift that. */ structures?: StructureCounts }[];
      landings: { planetId: string; units: UnitCounts;
        /** A planet the ground forces are committed from instead of the space area of the active system (49.2); a component may lift the warning. */ from?: string;
        /** Structures put on the planet from the space area of the active system, at the end of the action. */ structures?: StructureCounts }[];
      production: UnitCounts; payment: Payment;
      /** The six influence that remove the custodians token when the landing is the first on Mecatol Rex (27.2): planets exhausted, trade goods spent. */ custodiansPayment?: Payment;
      /** What the battle in the active system cost me: gone after the moves, before the landing and the production. */ losses?: UnitCounts;
      /** What the battle cost on planets, by planet id: gone after the landing. */ groundLosses?: Record<string, UnitCounts>;
      /** Ships I remove from the active system beyond my fleet pool (37.3): gone on arrival, or after the production if built then. */ fleetRemovals?: UnitCounts;
      /** Where the ground forces of `production` were bought, by planet id; what is not listed goes to the first planet I control. */ productionGround?: Record<string, UnitCounts>;
      /** The system the ships of `production` are placed in when it is not the active one (68.2 places them there; a component may lift the warning). */ shipsTo?: string;
      /** Warfare's primary in Thunder's Edge: no tactic token is spent and no command token goes down. */ free?: boolean;
      /** The id of the card entry that started this action: it goes when that entry goes. */ fromCard?: string; acts?: Act[] }
  | ({ type: 'strategic'; acts?: Act[] } & CardPlay)
  | ({ type: 'secondary' } & CardPlay)
  | { type: 'component';
      /** The component played: an action card leaves the hand, an agent is exhausted, a hero purged. Without it the action is only its note. */ componentId?: string;
      note: string;
      acts?: Act[];
      /** What the component produces, as a card's effects do: a hero or a technology that builds units (`production`, paid with `payment`). */ effects?: CardEffects;
      /** What the component costs when its effect declares a `cost`: the planets exhausted and the trade goods spent. */ payment?: Payment }
  | { type: 'pass'; acts?: Act[] }
  | { type: 'adjustment'; label: string; delta: AdjustmentDelta; kind?: AdjustmentKind;
      /** An agenda of the agenda phase: its outcome (`for` or `against`) and what was elected (`elect`: a planet id, a law id, `me` or an opponent id), the strategy card elected (`card`, its initiative as text or number). */ choices?: Record<string, string | number> }
  | { type: 'statusTokens'; tactic: number; fleet: number; strategy: number;
      /** My points gained this round. */ vp?: number;
      /** Opponent id to the points they gained this round. */ opponentVp?: Record<string, number>;
      /** Objectives the owner scored, by component id: a secret one leaves the hand for the scored ones, a public one joins them. */ scored?: string[];
      /** What scoring them cost, when an objective is scored by spending (61.10): tokens from the pools, trade goods, planets paying resources or influence. */ spend?: StatusSpend }
) & {
  /** Components the owner of the entry gains with it, by id: drawn action cards, a relic, a note received. */
  gains?: string[];
  /** Components the owner loses with it, one copy each. */
  spends?: string[];
  /**
   * Components the owner uses with it, by id, that are neither its component action nor spent: an agent or a technology
   * exhausted, an ability invoked. Each is played as a component action plays its own (exhausted, purged, discarded),
   * and its waivers hold for this entry (src/domain/effects/waivers.ts).
   */
  uses?: string[];
  /**
   * What the player chose for the component the entry plays (its component action), by the names its effect asks for
   * (`ComponentEffect.choose`): a planet id, a system slot, a player (`me` or an opponent id), a unit type, a number.
   * On an entry with no component action it goes to the components it uses.
   */
  choices?: Record<string, string | number>;
  /** The same for a component named in `uses`, by component id; it wins over `choices`, and is the one the editor writes. */
  useChoices?: Record<string, Record<string, string | number>>;
};

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

/** What a player holds of the game's components, by component id (`<kind>:<source id>`). */
export interface Holdings {
  /** Researched technologies, unit upgrades among them. */
  technologies: string[];
  /** Action cards in hand, with repeats. */
  hand: string[];
  relics: string[];
  /** Promissory notes in hand and those played face up. */
  promissory: string[];
  /** Leaders by id; one not listed is locked. */
  leaders: Record<string, LeaderState>;
  breakthrough?: 'held' | 'exhausted';
  /** Scored objectives, public and secret. */
  scored: string[];
  /** Secret objectives in hand. */
  secrets: string[];
  /**
   * Exploration cards found and kept in the play area, with repeats: the relic fragments (35.9) and the cards that
   * say so (Enigmatic Device). An exploration card that attaches, is a token or is resolved at once is held by no one.
   */
  found: string[];
  /** Exhausted components the status phase readies: technologies, relics, legendary planet cards. */
  exhausted: string[];
}
export type LeaderState = 'unlocked' | 'exhausted' | 'purged';
/** What a player held when the plan begins: the faction's starting technologies, and what was marked by hand. */
export type StartHoldings = Partial<Pick<Holdings, 'technologies' | 'hand' | 'relics' | 'promissory' | 'leaders' | 'breakthrough' | 'scored' | 'secrets' | 'found'>>;

/** The mark of a save this app reads. A save without it comes from an earlier version and is not read. */
export const SAVE_FORMAT = 'ti4-planner/2';

export interface Game {
  id: string;
  /** What the player calls this game; a link finds its save by this. */
  name?: string;
  format: typeof SAVE_FORMAT;
  /** Counts the changes of the save within the format, from 1. */
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
  /** What each player holds before the plan: the starting technologies of the faction, the rest set by hand. Entries of a plan add to it. */
  start: { me: StartHoldings; opponents: Record<string, StartHoldings> };
  /** Slot key to opponent id to that opponent's units in space; ground forces only in a system without planets. */
  enemyUnits: Record<string, Record<string, UnitCounts>>;
  /** Planet id to opponent id to that opponent's ground forces there. */
  enemyGround: Record<string, Record<string, UnitCounts>>;
  planetControl: Record<string, 'me' | 'enemy'>;
  /** Planet id to opponent id, only for enemy planets. An enemy planet with no owner belongs to the first opponent. */
  planetOwner: Record<string, string>;
  /** Ids of planets that have a space dock. A structure belongs to whoever controls its planet, or to me on a planet no one controls. */
  docks: string[];
  /** Planet id to the number of PDS on it, owned as the docks are. */
  pds: Record<string, number>;
  expedition: { slices: Record<string, 'me' | 'other' | null>; thundersEdgeSystem: string | null };
  fracture: { active: boolean; ingress: string[]; /** Chosen seat (1 is at the top, then clockwise); null puts the group at the default edge. */ seat: number | null;
    /** While open: slot key beside the map to its Fracture tile, so ships fly there like to any system. Absent until the Fracture first opens. */ tiles?: Record<string, string> };
  plans: Plan[];
  activePlanId: string;
}

export interface GameState {
  /** The faction of the player this state is, set by the replay: what a faction sheet brings (abilities, mech) is asked of it without a `Game`. */
  faction?: string;
  /** The player's units in each system's space, by slot key. */
  systems: Record<string, UnitCounts>;
  /** The player's ground forces on each planet, by planet id. */
  ground: Record<string, UnitCounts>;
  exhausted: string[];
  control: Record<string, 'me' | 'enemy'>;
  tokensOnMap: string[];
  tradeGoods: number;
  /** Commodities on the faction sheet: none at the start, a replenish fills them up to the faction's value (21.2, 21.3). */
  commodities: number;
  tactic: number;
  fleet: number;
  strategy: number;
  vp: number;
  /** Each opponent's starting points plus their gains in the status entries replayed so far, by opponent id. */
  opponentVp: Record<string, number>;
  /** What this player holds: the game's start plus the entries replayed so far. */
  holdings: Holdings;
  /** Laws in play, for the whole game: on my state only, whoever's entry brought them. */
  laws?: string[];
  /** Public objectives revealed, for the whole game: on my state only. */
  revealed?: string[];
  /** Law id to the faction of the player an `Elect Player` law binds (Censure, the ministers): on my state only; a law not listed binds everyone. */
  lawOwners?: Record<string, string>;
  /** Planet id to the cards attached to it, for the whole game: on my state only. */
  attachments?: Record<string, string[]>;
  /** This player's space docks: the game's on their planets, plus those built by the entries replayed so far, less those lost with a planet. */
  docks: string[];
  /** Planet id to this player's PDS count, the same way. */
  pds: Record<string, number>;
  /** This player's structures in the space area of a system, by slot key: carried there by an entry (`moves[].structures`) and not put on a planet yet. */
  afloat?: Record<string, StructureCounts>;
  /** Someone landed on Mecatol Rex in the entries replayed so far, so the custodians token is gone. */
  custodiansRemoved?: boolean;
  /** Each opponent counted the same way, from what stands on the map for them and their entries replayed so far. */
  rivals?: Record<string, GameState>;
  /** Planet id to the opponent whose entries landed there, ahead of the owner set by hand. */
  rivalHolds?: Record<string, string>;
  /** What waits on a component's card, by the component id as held: units placed on it (Crimson Legionnaire II), a technology lent with it (Share Knowledge). */
  onCard?: Record<string, { units?: UnitCounts; technology?: string }>;
}

/** Every warning the replay can give; the rule registry (src/domain/rules/registry.ts) maps each to its rules and step. */
export const WARNING_CODES = ['shortResources', 'shortInfluence', 'shortTradeGoods', 'planetExhausted',
  'capacityGroup', 'capacitySystem', 'fleetPool', 'unitsMissing', 'landingOverLimit',
  'sliceTaken', 'shortStrategy', 'primaryRepeated', 'tokensOver', 'poolNegative', 'systemHasToken', 'constructionUnits', 'speedShort', 'routeBlocked', 'sourceActivated',
  // command-tokens, round-flow, payment
  'noReinforcements', 'actionAfterPass', 'passBeforeStrategy', 'actionOutsidePhase', 'planetNotControlled', 'readyNotControlled',
  // strategy-cards
  'foreignPrimary', 'ownSecondary', 'secondaryRepeated', 'readyOverLimit', 'diplomacySystem', 'researchOverLimit', 'researchOwned',
  // combat-order, invasion, structures
  'shipOnPlanet', 'landingOutsideSystem', 'custodians', 'structureLimit', 'structureNotControlled', 'structureOutsideSystem',
  // production, thunders-edge
  'noProduction', 'productionBlockaded', 'blockaded', 'productionOver', 'reinforcementsOut', 'productionPlace', 'scarProduction',
  'expeditionUnpaid', 'expeditionTwicePerTurn', 'stationGround', 'stationStructure',
  // transactions
  'transactionRepeated', 'notNeighbor', 'shortCommodities', 'transactionNotes', 'transactionKind',
  // transport
  'pickupOffRoute',
  // components
  'componentNotHeld', 'componentExhausted', 'ownPromissory',
] as const;
export type WarningCode = (typeof WARNING_CODES)[number];
/**
 * A warning code declared in a file of its own under src/domain/rules/codes, so that a new rule touches no shared
 * file. Only `defineCode` (src/domain/rules/codeDef.ts) makes one; a step of the replay and a waiver import it from its file.
 */
export type ExtensionCode = string & { readonly __extensionCode: true };
/** Any code a warning can carry: one of the core list, or one of the files. */
export type AnyWarningCode = WarningCode | ExtensionCode;
/** The part of a round or of a tactical action (89.1-89.5) a violation comes from. */
export type RuleStep = 'activation' | 'movement' | 'transport' | 'combat' | 'invasion' | 'production' | 'payment' | 'card' | 'status' | 'round' | 'expedition' | 'transaction' | 'component';
/** Where a violation arose: the entry, and within it the source system or the planet when there is one. */
export interface ViolationPlace { entryId: string; source?: string; planetId?: string }
/**
 * A rule the plan breaks; it forbids nothing. The replay gives `rule` (LRR number as in the rules tests' names), `step` and `place`;
 * a warning written by hand (tests) may lack them.
 */
export interface Warning {
  code: AnyWarningCode;
  params: Record<string, string | number>;
  /**
   * The components that lift this check for the entry, by id (a note under its address). A waived warning is still
   * found and still listed; it only stops counting as a breach (`standing` in src/domain/rules/registry.ts).
   */
  waivedBy?: string[];
  readonly rule?: string;
  readonly step?: RuleStep;
  readonly place?: ViolationPlace;
}
export type Projection = { state: GameState; warningsByEntry: Record<string, Warning[]> };
