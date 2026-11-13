import { placesOf } from '../../../domain/project';
import { withProduction, withStructure, type CardEntry } from '../../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Holdings, StructureKind, UnitId } from '../../../domain/types';

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

/** Routes what the big hex buys into the entry's effects. */
export function cardPurchases(
  game: Game, pack: DataPack, entry: Pick<CardEntry, 'id' | 'effects'>, slot: string, before: GameState, apply: (effects: CardEffects) => void,
): PurchaseTarget {
  const effects = entry.effects ?? {};
  const production = effects.production?.systemId === slot ? effects.production : undefined;
  return {
    bought: placesOf(game, before, slot, production?.units ?? {}, pack, production?.ground),
    holdings: before.holdings,
    before,
    entryId: entry.id,
    change: (unit: UnitId, planetId, amount) => apply(withProduction(effects, slot, unit, planetId, amount)),
    structures: effects.structures,
    changeStructure: (kind, planetId, amount) => apply(withStructure(effects, kind, planetId, amount)),
  };
}
