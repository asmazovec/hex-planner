/** The old per-player state of the replay: the input language of the rules and component tests, not part of the application. */
import type { Shelf } from '../../../domain/shelf';
import type { Player } from '../../../domain/players';
import type { ExpansionId, MapLayout, SAVE_FORMAT, StartHoldings, StructureCounts, UnitCounts, Warning } from '../../../domain/types';
import type { RoundFacts, TurnBody, TurnFacts } from '../../../game/turnFacts';

export type Holdings = Shelf;

export type Projection = { state: GameState; warningsByEntry: Record<string, Warning[]> };

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

export type EntryBody = TurnBody;
export type Entry = TurnFacts;
export type Round = RoundFacts;
export interface Plan { id: string; name: string; rounds: Round[]; }

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
  opponents: Player[];
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
