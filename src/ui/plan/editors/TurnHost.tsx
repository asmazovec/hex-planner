import type { ReactNode } from 'react';
import type { DataPack } from '../../../domain/types';
import { useTurn, type TurnWrite } from '../../../state/turnBridge';
import type { KernelView } from '../kernelView';

/** The turn of an entry of the open plan and its writer, handed to what is drawn over it: the editors and the common part read the turn and hand the changed turn back through the bridge. */
export function TurnHost({ entryId, view, pack, children }: { entryId: string; view: KernelView; pack: DataPack; children: (write: TurnWrite) => ReactNode }) {
  const write = useTurn(view.table, entryId, pack);
  return write ? <>{children(write)}</> : null;
}
