/** The turn of a hand-written old entry and a writer that hands the changed turn back as the old patch, for the tests that render an editor of the kernel's turn over an entry. */
import type { Turn } from '../../game/actions';
import { factsOf } from '../../game/turnFacts';
import { planOf, turnOf } from '../../testing/old/game/fromLegacy';
import type { Act, DataPack, Payment } from '../../domain/types';
import type { Entry, EntryBody, Game } from '../../testing/old/domain/types';
import type { KernelView } from '../plan/kernelView';

const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/** The fields of an old entry that differ between two of its states; a field the second lacks is written as undefined. */
export function entryPatch(before: Entry, after: Entry): Partial<EntryBody> {
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === 'id') continue;
    const was = (before as unknown as Record<string, unknown>)[key];
    const now = (after as unknown as Record<string, unknown>)[key];
    if (!same(was, now)) patch[key] = now;
  }
  return patch as Partial<EntryBody>;
}

export function turnProps(view: KernelView, pack: DataPack, entry: Entry, update: (patch: Partial<EntryBody>) => void): { turn: Turn; view: KernelView; onChange: (next: Turn) => void } {
  const turn = turnOf(view.table, entry, pack);
  return { turn, view, onChange: next => update(entryPatch(factsOf(view.table, turn), factsOf(view.table, next))) };
}

/** The same for a card entry: the round of the first plan as the kernel keeps it comes with it (the cards held decide how a card is played). */
export function cardProps(view: KernelView, game: Game, pack: DataPack, entry: Entry, update: (patch: Partial<EntryBody>) => void) {
  return { ...turnProps(view, pack, entry, update), round: planOf(view.table, game.plans[0], pack)[0] };
}

/** A transaction as the step of a turn that holds it, and the writer that hands the changed transaction back as the old act: for the tests of `TransactionStep` over a hand-written act. `owner` is the old key of whose turn it is. */
export function transactionProps(view: KernelView, pack: DataPack, act: Act, owner: string, uses: string[] | undefined, update: (act: Act) => void): { turn: Turn; index: number; onChange: (next: Turn) => void } {
  const entry = { id: 't', phase: 'action', status: 'planned', type: 'pass', acts: [act], ...(owner === 'me' ? {} : { owner }), ...(uses ? { uses } : {}) } as Entry;
  return { turn: turnOf(view.table, entry, pack), index: 0, onChange: next => update((factsOf(view.table, next) as { acts: Act[] }).acts[0]) };
}

/** The same for an expedition contribution (`ExpeditionEditor`): the old patch of its part and payment. */
export function expeditionProps(view: KernelView, pack: DataPack, sliceId: string | null, payment: Payment, update: (patch: { sliceId: string | null; payment: Payment }) => void): { turn: Turn; index: number; onChange: (next: Turn) => void } {
  const entry = { id: 't', phase: 'action', status: 'planned', type: 'pass', acts: [{ kind: 'expedition', sliceId, payment }] } as Entry;
  return {
    turn: turnOf(view.table, entry, pack), index: 0,
    onChange: next => { const [act] = (factsOf(view.table, next) as { acts: { sliceId: string | null; payment: Payment }[] }).acts; update({ sliceId: act.sliceId, payment: act.payment }); },
  };
}

/** The turn of a component action and a writer that tells the old handlers what changed: the note, the component, the choices, the payment. */
export function playProps(
  view: KernelView, pack: DataPack, entry: Entry,
  on: { onNote?: (note: string) => void; onComponent?: (id: string | undefined) => void; onChoices?: (choices: unknown) => void; onPayment?: (payment: unknown) => void },
): { turn: Turn; onChange: (next: Turn) => void } {
  return turnProps(view, pack, entry, patch => {
    const keys = Object.keys(patch);
    if ('note' in patch) on.onNote?.((patch as { note: string }).note);
    if ('componentId' in patch) on.onComponent?.((patch as { componentId?: string }).componentId);
    if ('choices' in patch && !('componentId' in patch)) on.onChoices?.((patch as { choices?: unknown }).choices ?? {});
    if ('payment' in patch) on.onPayment?.((patch as { payment: unknown }).payment);
    void keys;
  });
}

/** The turn of an entry and a writer that hands the changed acts back as the old list. */
export function actsProps(view: KernelView, pack: DataPack, entry: Entry, update: (acts: Act[]) => void): { turn: Turn; onChange: (next: Turn) => void } {
  return { turn: turnOf(view.table, entry, pack), onChange: next => update((factsOf(view.table, next) as { acts?: Act[] }).acts ?? []) };
}
