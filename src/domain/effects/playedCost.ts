import type { PaymentKind } from '../payment';
import type { DataPack, Entry } from '../types';
import type { Ability } from './types';

/**
 * What a component entry costs to play: the cost its component declares (`cost`) and what the components it names in
 * `uses` declare for following it (`useCost`, a mech that deploys after an ability), in one kind (the first one's).
 * The editor's label, the automatic payment and the replay's check all ask this. `effectOf` is the registry's, passed
 * in so that this file does not import the registry the components import through the domain.
 */
export function playedCost(pack: DataPack, entry: Entry, effectOf: (pack: DataPack, id: string) => Ability | undefined): { kind: PaymentKind; amount: number } | undefined {
  if (entry.type !== 'component') return undefined;
  const own = entry.componentId ? effectOf(pack, entry.componentId)?.cost : undefined;
  const followed = (entry.uses ?? []).flatMap(id => effectOf(pack, id)?.useCost?.(entry) ?? []);
  const all = [...(own ? [own] : []), ...followed];
  const first = all[0];
  return first && { kind: first.kind, amount: all.filter(c => c.kind === first.kind).reduce((sum, c) => sum + c.amount, 0) };
}
