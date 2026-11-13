/**
 * The points and hooks of the invasion subsystem, added by declaration merging so that no shared interface is edited
 * (docs/phase4/infra/invasion.md). A file that uses them needs no import of this one: the augmentation is global.
 */
import type { DataPack, Entry, Game, GameState, StructureKind, Warning } from '../../types';

/** One planet newly gained, as a component hooked on the gain of control sees it. */
export interface ControlTurn {
  game: Game;
  /** The state of the player who gained the planet: control is theirs already and the planet is exhausted (25.1, 49.5.2). */
  state: GameState;
  pack: DataPack;
  warnings: Warning[];
  planetId: string;
  /** The entry that gains it; none when something outside an entry does (`takeControl` called without one). */
  entry?: Entry;
  /** The choices flat on the entry (`entry.choices`), as for a play. */
  choices: Record<string, string | number>;
  /** Another player controlled it until now (a planet no one controlled is not "taken"). */
  fromPlayer: boolean;
  /** Gaining it explores it (35.1): no one controlled it before. */
  explores: boolean;
  /** The structures that stood on it, destroyed with the loss of the planet (49.5.1): whose and how many. */
  lost: { kind: StructureKind; owner: string; count: number }[];
}

declare module '../types' {
  interface ModifierContext {
    /** The trade goods a player gains with each planet they gain control of; the base is 0 (Scavenge). */
    tradeGoodsOnControl: { planetId: string };
  }
}
