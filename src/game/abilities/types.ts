/**
 * What a component's ability is given and what it may do on the kernel. A hook never writes state: it reads through
 * the context and returns events (or warnings); `apply` is the only thing that changes a board. `holder` (who holds the
 * component) and `actor` (whose turn it is) are both in the context, so a file never has to find out whose it is.
 */
import type { ComponentDef, Entry, Goods, RuleStep, UnitCounts, Warning } from '../../domain/types';
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
export interface Hooked { holder: HolderRule; on: Hooks }

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
  /** Adds a warning of the turn. */
  warn(warning: Warning): void;
}

/** What a hook that changes something returns; the kernel stamps the cause (action, step, component) on each event. */
export type Effects = GameEvent[];

export interface Violation { warning: Warning }

export type { Board, Cause, ComponentDef, ComponentId, GameEvent, PlayerId, Table };
