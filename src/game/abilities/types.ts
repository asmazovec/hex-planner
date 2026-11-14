/**
 * What a component's ability is given and what it may do on the kernel. A hook never writes state: it reads through
 * the context and returns events (or warnings); `apply` is the only thing that changes a board. `holder` (who holds the
 * component) and `actor` (whose turn it is) are both in the context, so a file never has to find out whose it is.
 */
import type { AnyWarningCode, ComponentDef, Entry, Goods, RuleStep, UnitCounts, Warning } from '../../domain/types';
import type { ComponentEffect, ModifierContext, Modifiers } from '../../domain/effects/types';
import type { HolderRule } from '../../domain/effects/holder';
import type { Cause, GameEvent } from '../events';
import type { Board, ComponentId, DataPack, PlayerId, Table } from '../types';
import type { Reader } from './facade';

export type { HolderRule };

/** A component's ability: its effect and the declaration of whose action it speaks in. */
export interface Ability extends ComponentEffect {
  /** Required of a file written for the kernel. */
  holder: HolderRule;
}

/**
 * The hooks of a component written for the kernel, with the declaration of whose action they speak in. A file whose
 * other parts (play, waive, choose) are still written for the old state exports this as `ability` beside its `effect`.
 */
export interface Hooked {
  holder: HolderRule;
  on?: Hooks;
  permit?: Permit[];
  /** What playing the component does (a component action, or named in `uses`): reads through the context (`held`, `choices`) and returns events; violations go through `ctx.warn`. */
  play?: Play;
}

/** The play of a component on the kernel. */
export type Play = (ctx: AbilityContext) => Effects | void;

/**
 * A check a component lifts, in the words of the kernel. The warning is still made and listed; it is marked with the
 * component (`Warning.waivedBy`) and no longer counts as a breach. Asked by `game/resolve/waive.ts`: a `passive`
 * ability for the player whose action it is while it is in force, any other for the turn that names it (component
 * action, `spends`, `uses`), and with `lasts: 'round'` until the end of the round. A permit never changes a number:
 * that is a `modify`.
 */
export interface Permit {
  /** The code of the warning lifted. */
  code: AnyWarningCode;
  /** What lifts it: the sentence of the component's own text, or the LRR point. */
  rule: string;
  /** Narrows the permit to the warnings the component's text covers; without it every warning of the code is lifted. */
  when?: (warning: Warning, ctx: PermitContext) => boolean;
  /** `play` and `hint` only: the permit holds from the turn that names the component to the end of that round, for the same player. */
  lasts?: 'round';
  /** `passive` only: it also lifts the checks of a transaction whose other side holds the component, not only those of its holder. */
  partner?: boolean;
}

export type RouteBlockKind = 'asteroid' | 'supernova' | 'nebula' | 'ships' | 'structures' | 'hyperlane';

/** What a permit's `when` is given: the context of any ability (the board after the turn's step) and what the turn and the round add. */
export interface PermitContext extends AbilityContext {
  /** The board before the turn, and the holder read from it. */
  readonly before: Board;
  readonly had: Reader;
  /** The strategy cards whose primary the actor resolved earlier this round, when the round keeps them. */
  readonly primaries?: readonly number[];
  /** The components the actor played earlier in the round. */
  readonly plays: readonly string[];
  /** What a route warning is about: the anomaly that closes or ends the system, other players' ships, a hyperlane, or none. */
  routeBlockKind(warning: Warning): RouteBlockKind | undefined;
  /** Whether a speedShort warning is one ship's shortfall of at most `by` steps (the first of the turn that fits). */
  oneShipShort(warning: Warning, by?: number): boolean;
  /** The move value of the warning's ship by the printed rules and its upgrades alone. */
  speedWithoutAnomalies(warning: Warning): number;
  /** Whether the route of a speedShort warning leaves or crosses a gravity rift (41.3). */
  crossesRift(warning: Warning): boolean;
  /** Whether a system holds an anomaly of the kind. */
  hasAnomaly(slot: string, kind: 'asteroid' | 'nebula' | 'rift' | 'supernova'): boolean;
  /** Whether other players' ships end a route in the system, as the board stood before the turn. */
  blockedByShips(slot: string): boolean;
  /** The ships (not fighters, not ground forces) other players have in a system. */
  othersShipsIn(slot: string): UnitCounts;
  /** Whether every unit the move of the warning carried is one of these. */
  onlyUnits(warning: Warning, kinds: readonly string[]): boolean;
  /** Whether the move of the warning carried ships alone. */
  shipsOnly(warning: Warning): boolean;
  /** Whether another player (as the warning names them) is present in the system or next to it. */
  playerNear(player: string, slot: string): boolean;
  /** The slot of Mecatol Rex on the map. */
  mecatolSlot(): string | undefined;
}

/** What each hook kind is told besides the context: the moment's facts, in the words of the kernel. */
export interface HookPayloads {
  /** One side of a settled transaction: `gave` and `got` are what moved, `self` is the side asked. */
  dealt: { side: 'give' | 'get'; self: PlayerId; partner: PlayerId; gave: Goods; got: Goods };
  /** Strategy tokens spent from the pool. */
  onTokenSpent: { count: number; card?: number; secondary: boolean };
  /** One use of PRODUCTION. */
  onProduced: { units: UnitCounts; systemId: string };
  /** Units of the holder destroyed by the action. */
  onDestroyed: { losses: { unit: string; count: number; planetId?: string; systemId?: string }[] };
  /** A planet the holder controlled is now another player's. */
  onControlLost: { planetId: string; to: PlayerId };
  /** A system is activated by `activator`. */
  onActivate: { activator: PlayerId; systemId: string; planets: string[] };
  /** Ground forces land on a planet. */
  onLanding: { planetId: string; landed: number };
  /** The card the entry just gained (its `gains`), read as `ctx.id`; what the player chose for it is `ctx.choices`. */
  gained: Record<string, never>;
  /** The card the entry just let go (its `spends`): `ctx.id`. */
  lost: Record<string, never>;
  /** The checks a component in force adds after an entry; its warnings go through `ctx.warn`, the entry is `ctx.entry`. */
  restrict: Record<string, never>;
  /** The holder has just taken a planet: `fromPlayer` whether another player held it, `explores` that it was newly gained (35.1), `lost` the structures of the old owner that went with it. */
  onGainControl: { planetId: string; fromPlayer: boolean; explores: boolean; lost: { kind: 'pds' | 'spacedock'; owner: string; count: number }[] };
  onRoundStart: Record<string, never>;
  onStatusStart: Record<string, never>;
  onStatusEnd: Record<string, never>;
  onTurnStart: Record<string, never>;
}

export type HookKind = keyof HookPayloads;
/** A hook reads through the context and returns events; its warnings go through `ctx.warn`. */
export type Hook<K extends HookKind> = (ctx: AbilityContext, payload: HookPayloads[K]) => Effects | void;
export type Hooks = { [K in HookKind]?: Hook<K> };

/** Everything a hook of an ability is given. */
export interface AbilityContext {
  readonly board: Board;
  readonly table: Table;
  readonly pack: DataPack;
  /** Who holds the component. */
  readonly holder: PlayerId;
  /** Whose turn or action it is. */
  readonly actor: PlayerId;
  /** The step of the action being resolved. */
  readonly step?: RuleStep;
  /** Whether the holder held the component, ready, when it was played (false: the replay has already warned and a play may do nothing). */
  readonly held: boolean;
  /** What the player chose for the component (`ChoiceSpec`). */
  readonly choices: Readonly<Record<string, string | number>>;
  /** The holder, read from the board. */
  readonly my: Reader;
  /** Any player, read from the board. */
  of(player: PlayerId): Reader;
  /** Whether it is the holder's own action. */
  readonly own: boolean;
  /** The id the old model gives a player (`me` or the opponent's own id): notes carry it as their address. */
  key(player: PlayerId): string;
  /** The component asked, as held (a note under its address). */
  readonly id: ComponentId;
  /** The entry of the action the moment belongs to, when there is one. */
  readonly entry?: Entry;
  /** The commodity value of a player: the faction's printed value after the components that change it (21.1). */
  commodityValue(player: PlayerId): number;
  /** The player an old-model key (`me`, an opponent id; a note's address) names. */
  playerOf(key: string): PlayerId | undefined;
  /** The planets of a player's home system (where their faction, or their seat, puts them). */
  home(player: PlayerId): string[];
  /** Whether two players are neighbours (LRR 60). */
  neighbours(a: PlayerId, b: PlayerId): boolean;
  /** A point of the count for the holder: the base changed by their components in force. */
  applied<K extends keyof Modifiers>(point: K, base: number, ctx: ModifierContext[K]): number;
  /** The reinforcement-limit warnings of putting `units` on the board for the holder (72.1): one for each unit whose limit is passed. */
  unitLimit(units: UnitCounts, step?: RuleStep): Warning[];
  /** The planets of a slot of the map. */
  planetsIn(slot: string): string[];
  /** The slot of the map a planet lies in. */
  systemOf(planet: string): string | undefined;
  /** The context over the board once these events have happened: a play that does one thing and then asks the rules about the result. */
  after(events: readonly GameEvent[]): AbilityContext;
  /** Researches a technology of the holder as a technology is researched (90): the events, and through `warn` the checks of the research. */
  research(technology: ComponentId): GameEvent[];
  /** The checks of the holder's units in a system as the board stands: capacity and the fleet pool (16.3, 37.1). */
  systemWarnings(slot: string): Warning[];
  /** What the units cost the holder, each at its own cost (not the combined cost of a PRODUCTION use). */
  unitCost(units: UnitCounts): number;
  /** What a planet is worth to the holder for a payment of the kind, after what they hold changed it. */
  planetValue(planet: string, kind: 'resources' | 'influence'): number;
  /** The kind of tile a system of the map is (`home`, `green`, ...); none for a slot with no tile. */
  tileKind(slot: string): string | undefined;
  /** The wormholes a system holds, its tile's and its tokens'. */
  wormholes(slot: string): string[];
  /** The systems next to a system for a move (a shared side, a wormhole, a hyperlane). */
  adjacent(slot: string): string[];
  /** Adds a warning of the turn. */
  warn(warning: Warning): void;
}

/** What a hook that changes something returns; the kernel stamps the cause (action, step, component) on each event. */
export type Effects = GameEvent[];

export interface Violation { warning: Warning }

export type { Board, Cause, ComponentDef, ComponentId, GameEvent, PlayerId, Table };
