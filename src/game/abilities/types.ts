/**
 * What a component's ability is given and what it may do on the kernel. A hook never writes state: it reads through
 * the context and returns events (or warnings); `apply` is the only thing that changes a board. `holder` (who holds the
 * component) and `actor` (whose turn it is) are both in the context, so a file never has to find out whose it is.
 */
import type { ComponentDef, RuleStep, Warning } from '../../domain/types';
import type { ComponentEffect } from '../../domain/effects/types';
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
}

/** What a hook that changes something returns; the kernel stamps the cause (action, step, component) on each event. */
export type Effects = GameEvent[];

export interface Violation { warning: Warning }

export type { Board, Cause, ComponentDef, ComponentId, GameEvent, PlayerId, Table };
