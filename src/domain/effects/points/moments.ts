/**
 * The moments of a round the replay tells the components about (docs/phase4/infra/moments.md), added by declaration
 * merging so that no shared interface is edited: hooks on `Ability`, two points of the count, and `fire`, the
 * one place that asks them.
 *
 * A hook belongs to a `passive` effect (or a `play` one, for a component held and not yet played out) and runs for the player whose moment it is while the component is in force
 * (`inForceOf`), in registry order. The round-level moments (`onRoundStart`, `onStatusStart`) run for me only: the
 * opponents' components are not replayed; `onStatusEnd` runs for every player, for a card an opponent played for the phase.
 */
import type { UnitCounts } from '../../types';

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
}

export type MomentHook = 'onRoundStart' | 'onStatusStart' | 'onStatusEnd' | 'onTurnStart' | 'onTokenSpent' | 'onProduced' | 'onControlLost' | 'onDestroyed';
