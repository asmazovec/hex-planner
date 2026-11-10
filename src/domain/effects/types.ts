/**
 * The contract of a component's effect (design §5.1). A step of the count never names a component: it asks a named
 * point for its value through `applied`, and the ready components of the player answer.
 */
import type { DataPack, Entry, Game, GameState, RuleStep, StructureKind, UnitId, Warning } from '../types';

/**
 * `passive` applies by itself while the component is held and ready; `play` applies when an entry plays the component
 * with its choices; `hint` computes nothing: the app shows the component's text in the block of its step.
 */
export type EffectTier = 'passive' | 'play' | 'hint';

/** What each point of the count tells the modifiers about the thing being counted. */
export interface ModifierContext {
  /** The move value of one unit of a faction; 0 stands for a unit that does not move by itself. */
  speed: { faction: string; unit: UnitId };
  /** The capacity of one ship. */
  capacity: { faction: string; unit: UnitId };
  /** The ships a system may hold: the base is the fleet pool. */
  fleetLimit: { faction: string };
  /** The Production value of one producing unit on a planet: the base is the planet's resources plus the unit's value. */
  productionValue: { structure: StructureKind; planetId: string };
  /** The cost of one unit; half a resource for a unit built in pairs. */
  unitCost: { faction: string; unit: UnitId };
  planetResources: { planetId: string };
  planetInfluence: { planetId: string };
  /** What researching one technology costs, by its component id. */
  researchCost: { technology: string };
  /** The prerequisites a technology still lacks, by its component id. */
  prerequisites: { technology: string };
  /** Command tokens gained at a step. */
  tokensGained: { step: RuleStep };
  handLimit: { faction: string };
  vp: { faction: string };
}

/** The named points the count passes through: each takes the value so far and gives the value after this component. */
export type Modifiers = { [K in keyof ModifierContext]: (value: number, ctx: ModifierContext[K]) => number };

/** One component being played by a component action, with what the player chose for it. */
export interface EffectTurn {
  game: Game;
  /** The state of the player whose entry this is. */
  state: GameState;
  /** My state, which holds what belongs to the whole game: laws, revealed objectives, attachments. */
  shared: GameState;
  entry: Extract<Entry, { type: 'component' }>;
  choices: Record<string, string | number>;
  pack: DataPack;
  warnings: Warning[];
}

export interface ComponentEffect {
  tier: EffectTier;
  /** The LRR rule the effect stands on, numbered as in the rules tests; for a hint, the id of the component whose text is shown. */
  rule: string;
  /** passive: the changes to the points of the count, while the component is held and ready. */
  modify?: Partial<Modifiers>;
  /** play: what happens when an entry plays the component with its choices. */
  play?: (turn: EffectTurn) => void;
  /** hint: the steps in whose block the reminder stands; none where the data names no step. */
  hintAt?: RuleStep[];
}
