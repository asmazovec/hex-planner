import type { GameState, Holdings, StructureKind, UnitId } from '../../../domain/types';

export interface BoughtUnit { unit: UnitId; /** Null for the system's space area. */ planetId: string | null; count: number }

/** Where my purchases go: what it holds so far, and one tap to buy (1) or take back (-1). */
export interface PurchaseTarget {
  bought: BoughtUnit[];
  change: (unit: UnitId, planetId: string | null, amount: 1 | -1) => void;
  /** Structures this target holds: with `changeStructure` they stay in the entry and off the game. */
  structures?: { kind: StructureKind; planetId: string }[];
  changeStructure?: (kind: StructureKind, planetId: string, amount: 1 | -1) => void;
  /** What I hold, for the unit upgrades my prices follow; defaults to the round's end. */
  holdings?: Holdings;
  /** The state the purchase pays with. */
  before?: GameState;
  /** The entry whose warnings the shop shows. */
  entryId?: string;
}
