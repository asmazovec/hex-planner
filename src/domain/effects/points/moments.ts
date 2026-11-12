/**
 * The moments of a round the replay tells the components about (docs/phase4/infra/moments.md), added by declaration
 * merging so that no shared interface is edited: hooks on `ComponentEffect`, two points of the count, and `fire`, the
 * one place that asks them.
 *
 * A hook belongs to a `passive` effect (or a `play` one, for a component held and not yet played out) and runs for the player whose moment it is while the component is in force
 * (`inForceOf`), in registry order. The round-level moments (`onRoundStart`, `onStatusStart`, `onStatusEnd`) run for me
 * only: the opponents' components are not replayed.
 */
import type { DataPack, Entry, Game, GameState, UnitCounts, Warning } from '../../types';
import { effectOf, holderOf, inForceOf, orderOf } from '../registry';
import type { ComponentEffect } from '../types';

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

  interface ComponentEffect {
    /** Passive: at the start of the strategy phase, once a round, before the first entry of the round that is replayed. */
    onRoundStart?: (turn: MomentTurn) => void;
    /** Passive: at the start of the status phase, once a round, before its first entry (or when the agenda begins). */
    onStatusStart?: (turn: MomentTurn) => void;
    /** Passive: at the end of the status phase, once a round, after its tokens are gained and the board is cleared. */
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

/** Where a moment happens: the same fields as the turn, less the component. */
export type Moment = Omit<MomentTurn, 'id' | 'player' | 'states'> & { player?: string; states?: Record<string, GameState> };

type Extra<H extends MomentHook> = Omit<Parameters<NonNullable<ComponentEffect[H]>>[0], keyof MomentTurn>;

/** The components in force for the player of `at` that have the hook, in registry order. */
export function hooked(hook: MomentHook, at: Pick<Moment, 'game' | 'state' | 'shared' | 'pack'>): string[] {
  return inForceOf(at.pack, holderOf(at.game, at.state, at.shared), effect => effect.tier !== 'hint' && effect[hook] !== undefined);
}

/** Runs the hook of the given components (`hooked`, asked before the moment when the moment changes what is in force); says how many ran. */
export function run<H extends MomentHook>(hook: H, ids: string[], at: Moment, extra: Extra<H>): number {
  const player = at.player ?? 'me';
  const states = at.states ?? { [player]: at.state };
  for (const id of [...ids].sort((a, b) => orderOf(at.pack, a) - orderOf(at.pack, b))) {
    const call = effectOf(at.pack, id)?.[hook] as ((turn: unknown) => void) | undefined;
    call?.({ ...at, player, states, ...extra, id });
  }
  return ids.length;
}

/** Asks the components in force for the player of `at` now. */
export function fire<H extends MomentHook>(hook: H, at: Moment, extra: Extra<H>): number {
  return run(hook, hooked(hook, at), at, extra);
}
