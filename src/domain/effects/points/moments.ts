/**
 * The moments of a round the replay tells the components about (docs/phase4/infra/moments.md), added by declaration
 * merging so that no shared interface is edited: hooks on `Ability`, two points of the count, and `fire`, the
 * one place that asks them.
 *
 * A hook belongs to a `passive` effect (or a `play` one, for a component held and not yet played out) and runs for the player whose moment it is while the component is in force
 * (`inForceOf`), in registry order. The round-level moments (`onRoundStart`, `onStatusStart`) run for me only: the
 * opponents' components are not replayed; `onStatusEnd` runs for every player, for a card an opponent played for the phase.
 */
import type { DataPack, Entry, Game, GameState, UnitCounts, Warning } from '../../types';

/** What every moment's hook is given. */
export interface MomentTurn {
  game: Game;
  /** The state of the player whose moment it is. */
  state: GameState;
  /** My state, which holds what belongs to the whole game: laws, revealed objectives, attachments. */
  shared: GameState;
  pack: DataPack;
  /** The warnings of the entry the moment belongs to; the hook pushes its own checks here. */
  warnings: Warning[];
  /** The component asked, as held (a note under its address). */
  id: string;
  /** `me` or the opponent whose moment it is. */
  player: string;
  /** Every player's state by `me` or opponent id. */
  states: Record<string, GameState>;
  /** The entry the moment happens in, when there is one. */
  entry?: Entry;
}

/** A strategy token spent from the pool: `count` tokens, by a strategy card (`card`, its secondary or primary) or by a component. */
export interface TokenSpent { count: number; card?: number; secondary: boolean }
/** One use of PRODUCTION: the units it made and the system it was used in. */
export interface Produced { units: UnitCounts; systemId: string }
/** A planet I controlled is now another player's: `to` is the player who took it. */
export interface ControlLost { planetId: string; to: string }
/** Units destroyed in an entry: ships in the active system's space (`planetId` undefined) or ground forces on a planet. */
export interface Destroyed { losses: { unit: string; count: number; planetId?: string; systemId?: string }[] }

declare module '../types' {
  interface ModifierContext {
    /** The most command tokens a fleet pool may hold; the base is no limit (Fleet Regulations sets 4). */
    fleetPoolMax: { faction: string };
    /** The trade goods a player gains after they replenish commodities; the base is 0. `neighbours` counts the players who are their neighbours (LRR 60). */
    tradeGoodsOnReplenish: { faction: string; neighbours: number };
  }

  interface Ability {
    /** Passive: at the start of the strategy phase, once a round, before the first entry of the round that is replayed. */
    onRoundStart?: (turn: MomentTurn) => void;
    /** Passive: at the start of the status phase, once a round, before its first entry (or when the agenda begins). */
    onStatusStart?: (turn: MomentTurn) => void;
    /** Passive: at the end of the status phase, once a round, for each player, after its tokens are gained and the board is cleared. */
    onStatusEnd?: (turn: MomentTurn) => void;
    /** Passive: at the start of each turn of the action phase of the player, before the entry that is the turn. */
    onTurnStart?: (turn: MomentTurn) => void;
    /** Passive: after a strategy token is spent from the pool. */
    onTokenSpent?: (turn: MomentTurn & TokenSpent) => void;
    /** Passive: after a use of PRODUCTION, with the units produced. */
    onProduced?: (turn: MomentTurn & Produced) => void;
    /** Passive: when a planet the component's owner controlled is taken by another player. */
    onControlLost?: (turn: MomentTurn & ControlLost) => void;
    /** Passive: when units of the component's owner are destroyed by an entry (the losses it records). */
    onDestroyed?: (turn: MomentTurn & Destroyed) => void;
  }
}

export type MomentHook = 'onRoundStart' | 'onStatusStart' | 'onStatusEnd' | 'onTurnStart' | 'onTokenSpent' | 'onProduced' | 'onControlLost' | 'onDestroyed';
