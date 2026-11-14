import type { DataPack, Entry, Game, Warning } from '../../../../../domain/types';
import type { GameState } from '../../types';
import type { Destroyed, ControlLost, Produced, TokenSpent } from '../../../../../domain/effects/points/moments';

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


declare module '../../../../../domain/effects/types' {
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
