/** The old per-player state of the replay: the input language of the rules and component tests, not part of the application. */
import type { Shelf } from '../../../domain/shelf';
import type { StructureCounts, UnitCounts, Warning } from '../../../domain/types';

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
