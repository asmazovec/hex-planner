import { withCardChange, withCardProduction, withCardStructure } from '../../../game/edit/strategic';
import { withProducedPayment } from '../../../game/edit/turn';
import { withProduction, withStructure } from '../../../domain/strategy';
import { boughtOn, effectsOf, isCardTurn, purchasesOn } from '../../../game/edit/strategicRead';
import type { TurnWrite } from '../../../state/turnBridge';
import type { CardEffects, DataPack } from '../../../domain/types';
import type { KernelView } from '../../plan/kernelView';
import type { PurchaseTarget } from './purchases';

/**
 * Routes what the big hex buys into the card turn: the units stand where the replay places them, and a tap changes the
 * turn through the kernel's edits, paid anew unless the payment is chosen by hand. `before` and `holdings` are what the
 * shop still reads of the old state.
 */
export function turnPurchases(
  view: KernelView, pack: DataPack, write: TurnWrite, slot: string, manual: boolean,
): PurchaseTarget | undefined {
  const { turn } = write;
  if (!isCardTurn(turn)) return undefined;
  const { table, board } = view;
  const apply = (next: typeof turn) => write.update(withCardChange(table, board, pack, turn, { effects: effectsOf(next) }, manual));
  return {
    bought: purchasesOn(table, board, pack, turn, slot),
    view, player: turn.player,
    entryId: turn.id,
    change: (unit, planetId, amount) => apply(withCardProduction(turn, slot, unit, planetId, amount) as typeof turn),
    structures: effectsOf(turn).structures,
    changeStructure: (kind, planetId, amount) => apply(withCardStructure(turn, kind, planetId, amount) as typeof turn),
  };
}

/** The same for a component action that produces: what it buys goes into its effects, paid anew unless the payment is chosen by hand. */
export function componentPurchases(
  view: KernelView, pack: DataPack, write: TurnWrite, slot: string, manual: boolean,
): PurchaseTarget | undefined {
  const { turn } = write;
  if (turn.action.kind !== 'component') return undefined;
  const { table, board } = view;
  const effects: CardEffects = turn.action.effects ?? {};
  const apply = (next: CardEffects) => write.update(withProducedPayment(table, board, pack, turn, next, manual));
  return {
    bought: boughtOn(table, board, pack, turn.player, effects, slot),
    view, player: turn.player,
    entryId: turn.id,
    change: (unit, planetId, amount) => apply(withProduction(effects, slot, unit, planetId, amount)),
    structures: effects.structures,
    changeStructure: (kind, planetId, amount) => apply(withStructure(effects, kind, planetId, amount)),
  };
}
