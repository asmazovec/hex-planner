/**
 * The language of a plan: a turn of a player, and what a turn holds. A tactical action is described by what the player
 * says happened (the route of each flight, who was lost, where the landing and the production went), and the resolver
 * turns that into events and violations. The other actions are declared so that the type is whole; the resolver does
 * not resolve them yet (step 2b).
 */
import type { Payment, StructureCounts, UnitCounts } from '../domain/types';
import type { Place } from './events';
import type { ComponentId, PlanetId, PlayerId, Slot } from './types';

export type { Payment };

/** One source of a flight: units taken from a system or a planet, and the way they go. */
export interface Flight {
  /** A system's space area; a planet means ground forces picked up from it. */
  from: Place;
  units: UnitCounts;
  /** The systems on the way, in flight order, between the source and the active system. */
  via?: Slot[];
  /** The units board the ships of this other source on their way (a pickup). */
  pickupOf?: Slot;
  /** Structures taken on board (the rules forbid it, 85.3; a component may lift that). */
  structures?: StructureCounts;
}

/** Ground forces and structures put on a planet of the active system. */
export interface Landing {
  planet: PlanetId;
  units: UnitCounts;
  /** Committed from another planet instead of the space area (49.2). */
  from?: PlanetId;
  /** Structures put on the planet from the space area, at the end of the action. */
  structures?: StructureCounts;
}

/** What is built in a tactical action, where it goes and how it is paid. */
export interface Build {
  units: UnitCounts;
  /** Where ground forces were bought, by planet; the rest goes to the first planet of the player. */
  ground?: Record<PlanetId, UnitCounts>;
  /** The system the ships are placed in when it is not the active one. */
  shipsTo?: Slot;
  payment: Payment;
}

export interface Tactical {
  kind: 'tactical';
  /** The active system; none while the action is not filled in. */
  system: Slot | null;
  /** No tactic token is spent (Warfare's primary in Thunder's Edge). */
  free?: boolean;
  movement: Flight[];
  /** What the battle in space cost each side, by player. */
  spaceCombat?: Record<PlayerId, UnitCounts>;
  invasion: Landing[];
  /** What the battles on planets cost each side: planet, then player. */
  groundCombat?: Record<PlanetId, Record<PlayerId, UnitCounts>>;
  production?: Build;
  /** Ships removed from the active system beyond the fleet pool (37.3). */
  fleetRemovals?: UnitCounts;
  /** The six influence that remove the custodians token on the first landing on Mecatol Rex (27.2). */
  custodians?: Payment;
}

export interface Goods { tradeGoods?: number; commodities?: number; components?: ComponentId[] }

/** A transaction with a neighbour (94). */
export interface Transaction { kind: 'transaction'; with: PlayerId; give: Goods; get: Goods }

/** An expedition at the end of a turn (Thunder's Edge). */
export interface Expedition { kind: 'expedition'; slice: string | null; payment: Payment }

/** A component applied in a turn besides its action, with what the player chose for it. */
export interface ComponentUse { component: ComponentId; choices?: Record<string, string | number> }

// Declared, not resolved yet.
export interface Strategic { kind: 'strategic'; card: number; forToken?: boolean; effects?: unknown }
export interface Secondary { kind: 'secondary'; card: number; effects?: unknown }
export interface ComponentPlay { kind: 'component'; component?: ComponentId; note: string; effects?: unknown; payment?: Payment }
export interface Pass { kind: 'pass' }
export interface StatusPhase { kind: 'status'; tokens: { tactic: number; fleet: number; strategy: number }; vp?: number; scored?: ComponentId[] }
export interface Agenda { kind: 'agenda'; card?: ComponentId; choices?: Record<string, string | number> }
export interface Correction { kind: 'correction'; label: string; delta?: unknown }

export type Action = Tactical | Strategic | Secondary | ComponentPlay | Pass | StatusPhase | Agenda | Correction;

export interface Turn {
  id: string;
  player: PlayerId;
  status: 'planned' | 'done' | 'cancelled';
  action: Action;
  /** Transactions, then the expedition at the end of the turn. */
  acts: (Transaction | Expedition)[];
  used: ComponentUse[];
  /** Components the player gains and loses with the turn. */
  gains?: ComponentId[];
  spends?: ComponentId[];
  /** What the player chose for the components the turn plays. */
  choices?: Record<string, string | number>;
}
