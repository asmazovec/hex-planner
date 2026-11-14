/** The turn of a hand-written old entry and a writer that hands the changed turn back as the old patch, for the tests that render an editor of the kernel's turn over an entry. */
import type { Turn } from '../../game/actions';
import { legacyEntry } from '../../game/entry';
import { planOf, turnOf } from '../../game/fromLegacy';
import { entryPatch } from '../../state/turnBridge';
import type { DataPack, Entry, EntryBody, Game } from '../../domain/types';
import type { KernelView } from '../plan/kernelView';

export function turnProps(view: KernelView, pack: DataPack, entry: Entry, update: (patch: Partial<EntryBody>) => void): { turn: Turn; onChange: (next: Turn) => void } {
  const turn = turnOf(view.table, entry, pack);
  return { turn, onChange: next => update(entryPatch(legacyEntry(view.table, turn), legacyEntry(view.table, next))) };
}

/** The same for a card entry: the round of the first plan as the kernel keeps it comes with it (the cards held decide how a card is played). */
export function cardProps(view: KernelView, game: Game, pack: DataPack, entry: Entry, update: (patch: Partial<EntryBody>) => void) {
  return { ...turnProps(view, pack, entry, update), round: planOf(view.table, game.plans[0], pack)[0] };
}
