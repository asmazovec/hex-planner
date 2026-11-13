/**
 * The only ways a board changes. Each event is one fact of the game; the rule that made it happen is `cause`. Counts in
 * events are signed only where the fact itself is a change (`delta`); everything else is an amount to add or take.
 */
import type {
  CardState, ComponentId, Phase, PlanetId, PlayerId, RuleStep, Slot, StructureCounts, TileRef, UnitCounts,
} from './types';

/** Where something stands: in the space area of a system, or on a planet. */
export type Place = { slot: Slot } | { planet: PlanetId };

/** What brought an event about: the turn of the plan, the step of the rules, the component that did it. */
export interface Cause { turn?: string; step?: RuleStep; component?: ComponentId }

export interface Delta { tactic?: number; fleet?: number; strategy?: number }

type Fact<T extends string, P = object> = { type: T; cause?: Cause } & P;
/** A fact about a player. */
type PlayerFact<T extends string, P = object> = Fact<T, { player: PlayerId } & P>;

export type GameEvent =
  // The frame of a game: round, phase, turn.
  | Fact<'RoundStarted', { round: number }>
  | Fact<'PhaseStarted', { phase: Phase }>
  | PlayerFact<'TurnStarted'>
  | PlayerFact<'TurnEnded'>
  | PlayerFact<'Passed'>
  // Units and structures.
  | PlayerFact<'UnitsPlaced', { at: Place; units: UnitCounts }>
  | PlayerFact<'UnitsRemoved', { at: Place; units: UnitCounts; reason?: 'combat' | 'limit' | 'cost' | 'capture' }>
  | PlayerFact<'UnitsMoved', { from: Place; to: Place; units: UnitCounts }>
  | PlayerFact<'StructurePlaced', { at: Place; structures: StructureCounts }>
  | PlayerFact<'StructureRemoved', { at: Place; structures: StructureCounts }>
  | PlayerFact<'StructureMoved', { from: Place; to: Place; structures: StructureCounts }>
  // Planets.
  | PlayerFact<'PlanetGained', { planet: PlanetId }>
  | Fact<'PlanetLost', { planet: PlanetId }>
  | PlayerFact<'PlanetExhausted', { planet: PlanetId }>
  | PlayerFact<'PlanetReadied', { planet: PlanetId }>
  | Fact<'CardAttached', { planet: PlanetId; card: ComponentId }>
  // Command tokens, in the pools and on the map.
  | PlayerFact<'SystemActivated', { system: Slot }>
  | PlayerFact<'TokensChanged', { delta: Delta }>
  | PlayerFact<'TokenReturned', { system?: Slot }>
  // Goods.
  | PlayerFact<'TradeGoodsChanged', { delta: number }>
  | PlayerFact<'CommoditiesChanged', { delta: number }>
  | Fact<'GoodsTransferred', { from: PlayerId; to: PlayerId; tradeGoods?: number; commodities?: number; cards?: ComponentId[] }>
  // Cards.
  | PlayerFact<'CardGained', { card: ComponentId; count?: number; /** `ready` when absent; a leader not yet unlocked comes `locked`. */ state?: CardState }>
  | PlayerFact<'CardLost', { card: ComponentId; count?: number }>
  | PlayerFact<'CardExhausted', { card: ComponentId }>
  | PlayerFact<'CardReadied', { card: ComponentId }>
  | PlayerFact<'CardUnlocked', { card: ComponentId }>
  | PlayerFact<'CardPurged', { card: ComponentId }>
  | PlayerFact<'TechnologyResearched', { technology: ComponentId }>
  // Objectives, points, laws.
  | Fact<'ObjectiveRevealed', { objective: ComponentId }>
  | PlayerFact<'ObjectiveScored', { objective: ComponentId }>
  | PlayerFact<'PointsChanged', { delta: number }>
  | Fact<'LawEnacted', { law: ComponentId; elected?: PlayerId }>
  | Fact<'LawDiscarded', { law: ComponentId }>
  // Strategy cards and the speaker.
  | PlayerFact<'SpeakerChanged'>
  | PlayerFact<'StrategyCardPicked', { card: number }>
  | PlayerFact<'StrategyCardPlayed', { card: number }>
  // Mecatol, Thunder's Edge, wormholes.
  | PlayerFact<'CustodiansRemoved'>
  | PlayerFact<'ExpeditionSliceTaken', { slice: string }>
  | Fact<'FractureOpened', { tiles: Record<Slot, TileRef> }>
  | Fact<'WormholeTokenPlaced', { system: Slot; wormhole: string }>
  | Fact<'WormholeTokenMoved', { from: Slot; to: Slot; wormhole: string }>
  | Fact<'ThundersEdgeSlotSet', { system: Slot }>
  | Fact<'AnomalyTokenPlaced', { system: Slot; anomaly: string }>
  // What stands on a component's own card.
  | PlayerFact<'CardLoaded', { card: ComponentId; units?: UnitCounts; technology?: ComponentId }>
  | PlayerFact<'CardUnloaded', { card: ComponentId; units?: UnitCounts; technology?: ComponentId }>;

export type EventType = GameEvent['type'];
