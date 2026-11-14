import { withCardChange, withCardProduction, withCardStructure } from '../../../game/edit/strategic';
import { effectsOf, isCardTurn, purchasesOn } from '../../../game/edit/strategicRead';
import type { TurnWrite } from '../../../state/turnBridge';
import type { DataPack } from '../../../domain/types';
import type { KernelView } from '../../plan/kernelView';
import type { PurchaseTarget } from './purchases';

/**
 * Routes what the big hex buys into the card turn: the units stand where the replay places them, and a tap changes the
 * turn through the kernel's edits, paid anew unless the payment is chosen by hand. `before` and `holdings` are what the
 * shop still reads of the old state.
 */
export function turnPurchases(
  view: KernelView, pack: DataPack, write: TurnWrite, slot: string, manual: boolean, old: Pick<PurchaseTarget, 'before' | 'holdings'>,
): PurchaseTarget | undefined {
  const { turn } = write;
  if (!isCardTurn(turn)) return undefined;
  const { table, board } = view;
  const apply = (next: typeof turn) => write.update(withCardChange(table, board, pack, turn, { effects: effectsOf(next) }, manual));
  return {
    bought: purchasesOn(table, board, pack, turn, slot),
    ...old,
    entryId: turn.id,
    change: (unit, planetId, amount) => apply(withCardProduction(turn, slot, unit, planetId, amount) as typeof turn),
    structures: effectsOf(turn).structures,
    changeStructure: (kind, planetId, amount) => apply(withCardStructure(turn, kind, planetId, amount) as typeof turn),
  };
}
