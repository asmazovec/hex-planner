/**
 * What the status subsystem adds to the contract of effects, by declaration merging so that the shared interfaces of
 * `../types` stay as they are: two points of the count, the hooks a law, an objective or a card with a one-time effect
 * needs, and the helpers that ask them. See docs/phase4/infra/status.md.
 *
 * Points (asked with `applied`, or with `appliedFor` of `../entryApply` when the entry's own components take part):
 *  - `secretLimit`: how many secret objectives a player may have, scored or not (LRR 61.21); base 3.
 *  - `strategyCost`: how many strategy tokens a card's primary (as a token play) or secondary costs (83.3, 83.4, 20.5); base 1.
 *  - `tokensGained` (step `status`), `handLimit` and `vp` were declared before; the first two are asked now.
 */
import objectiveUnmet from '../../rules/codes/objectiveUnmet';
import { violation } from '../../rules/registry';
import type { DataPack, Entry, UnitCounts, Warning } from '../../types';
import type { MapSource } from '../../replay/board';
import type { AbilityContext } from '../../../game/abilities/types';
import type { PlayerId } from '../../../game/types';
import { componentById } from '../../components';
import { playedBy } from '../waivers';
import type { Ability } from '../types';

/**
 * What a requirement of an objective is asked with: the board just before the status entry that scores it, read for
 * the player who scores (`my`, `holder`) through the readers of any ability, and what an objective counts besides.
 */
export interface RequirementContext extends AbilityContext {
  /** The status entry that scores the objective. */
  readonly entry: Extract<Entry, { type: 'statusTokens' }>;
  /** The component id of the objective. */
  readonly objective: string;
  /** The map as the movement code reads it (the table's map and the open Fracture). */
  readonly map: MapSource;
  /** The scorer's units in the space area of each system where they have any. */
  fleets(): { slot: string; units: UnitCounts }[];
  /** The scorer's ground forces on each planet where they have any, controlled or not. */
  grounds(): { planet: string; units: UnitCounts }[];
  /** Who controls a planet. */
  controller(planet: string): PlayerId | undefined;
  /** The other players. */
  others(): PlayerId[];
  /** The planets of the scorer that are not exhausted. */
  readyPlanets(): string[];
  /** The Production value of the scorer's units in a system. */
  productionIn(slot: string): number;
  /** How many planets in the systems of the board a player controls. */
  controlledOnBoard(player: PlayerId): number;
}

declare module '../types' {
  interface ModifierContext {
    /** How many secret objectives a player may have, scored or not. */
    secretLimit: { faction: string };
    /** The strategy tokens a card's primary played for a token, or its secondary, costs: 0 for none. */
    strategyCost: { card: number | undefined; secondary: boolean };
  }

  interface Ability {
    /**
     * An objective: what its requirement counts when a status entry scores it. `have < need` is the warning
     * `objectiveUnmet`. Asked against the owner's board before the entry (LRR 81.1 note 1).
     */
    requirement?: (ctx: RequirementContext) => { have: number; need: number };
    /** A law in force: the components of this id that are not in force while it is (Articles of War takes away the mechs). */
    suppresses?: (id: string) => boolean;
  }
}

/** The action cards an entry plays: its component action, what it spends and what it names in `uses`. */
export function actionCardsPlayed(entry: Entry, pack: DataPack): string[] {
  return playedBy(entry).filter(id => componentById(pack, id)?.kind === 'actionCard');
}

/** The warning of an objective whose requirement is not met; `have` and `need` are what the objective counts. */
export function objectiveNotMet(objective: string, have: number, need: number): Warning {
  return violation(objectiveUnmet.code, { objective, have, need }, 'status');
}

/** What the status entry's `spend` paid: command tokens from the pools, trade goods, the resources and the influence of the planets exhausted. */
export interface Spent { tokens: number; tradeGoods: number; resources: number; influence: number }

export type { Ability };
