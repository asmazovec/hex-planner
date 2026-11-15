import type { StructureKind, UnitId } from '../../../domain/types';
import type { PlayerId } from '../../../game/types';
import type { KernelView } from '../../plan/kernelView';

export interface BoughtUnit { unit: UnitId; /** Null for the system's space area. */ planetId: string | null; count: number }

/** Where my purchases go: what it holds so far, and one tap to buy (1) or take back (-1). */
export interface PurchaseTarget {
  bought: BoughtUnit[];
  /** The same units by the row of the shop they were bought in, where that differs from where they stand: ground forces bought on a planet their player does not control stand elsewhere on the hex. */
  entered?: BoughtUnit[];
  change: (unit: UnitId, planetId: string | null, amount: 1 | -1) => void;
  /** Structures this target holds: with `changeStructure` they stay in the entry and off the game. */
  structures?: { kind: StructureKind; planetId: string }[];
  changeStructure?: (kind: StructureKind, planetId: string, amount: 1 | -1) => void;
  /** The table and the board just before the turn the purchase pays with: its resources, upgrades and prices; defaults to the round's end. */
  view?: KernelView;
  /** Whose turn it is: the player who pays. */
  player?: PlayerId;
  /** The entry whose warnings the shop shows. */
  entryId?: string;
}
