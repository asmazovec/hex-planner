/**
 * The contract of a component's effect (design §5.1). A step of the count never names a component: it asks a named
 * point for its value through `applied`, and the components of the player answer.
 */
import type { AnyWarningCode, DataPack, Entry, Game, GameState, RuleStep, StructureKind, UnitId, Warning } from '../types';

/**
 * `passive` applies by itself while the component is in force (`inForce`), exhausted or not (LRR 34.4.1); `play`
 * applies when an entry plays the component with its choices; `hint` computes nothing: the app shows the component's
 * text in the block of its step.
 *
 * The tier also says when the component's waivers (`waive`) hold: those of a `passive` effect for every entry of the
 * player while the component is in force; those of a `play` or `hint` effect for the entry that names the component
 * (its component action, its `spends`, its `uses`), and with `lasts: 'round'` for the player's later entries of that round.
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
  /** `attached`: the cards and laws attached to the planet (`attachments`), so a law elected for one planet knows if it is this one. */
  planetResources: { planetId: string; attached?: readonly string[] };
  planetInfluence: { planetId: string; attached?: readonly string[] };
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

/** What a waiver is asked with: the entry whose warning it is, and the board of its owner around it. */
export interface WaiverContext {
  pack: DataPack;
  /** The game as the owner of the entry sees it: `game.faction` is theirs. */
  game: Game;
  /** The entry the warning belongs to; none for a check of the board itself (units placed by hand). */
  entry?: Entry;
  /** The owner's state just before the entry, and after it. */
  before: GameState;
  after: GameState;
  /** My state, which holds what belongs to the whole game: laws, revealed objectives, attachments. */
  shared: GameState;
}

/**
 * A check a component lifts. The warning is still made and still listed; it is marked with the component
 * (`Warning.waivedBy`) and no longer counts as a breach. A waiver never changes a number: a component that changes
 * the limit itself (two more ships, one more place on board) is a `modify`.
 */
export interface Waiver {
  /** The code of the warning lifted. */
  code: AnyWarningCode;
  /** What lifts it: the sentence of the component's own text, or the LRR point. */
  rule: string;
  /** Narrows the waiver to the warnings the component's text covers; without it every warning of the code is lifted. */
  when?: (warning: Warning, ctx: WaiverContext) => boolean;
  /** `play` and `hint` only: the waiver holds from the entry that names the component to the end of that round, for the same player. */
  lasts?: 'round';
}

/** One component being played by an entry, with what the player chose for it. */
export interface EffectTurn {
  game: Game;
  /** The state of the player whose entry this is. */
  state: GameState;
  /** My state, which holds what belongs to the whole game: laws, revealed objectives, attachments. */
  shared: GameState;
  /** The entry that plays it: a component action, or any entry that names it in `uses`. */
  entry: Entry;
  choices: Record<string, string | number>;
  pack: DataPack;
  warnings: Warning[];
}

export interface ComponentEffect {
  tier: EffectTier;
  /** The LRR rule the effect stands on, numbered as in the rules tests; the id of the component itself when its printed text is the rule, as for every hint. */
  rule: string;
  /** passive: the changes to the points of the count, while the component is held. */
  modify?: Partial<Modifiers>;
  /** play: what happens when an entry plays the component with its choices. */
  play?: (turn: EffectTurn) => void;
  /** hint: the steps in whose block the reminder stands; none where the data names no step. */
  hintAt?: RuleStep[];
  /** Any tier: the checks the component lifts (see `EffectTier` for when they hold). */
  waive?: Waiver[];
}
