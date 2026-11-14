/**
 * The write side of the bridge between the kernel's turns and the stored entries: an editor works on the `Turn` of an
 * entry and hands the changed turn back; here it is turned into the patch of old entry fields that the store takes, in
 * one place, until the store itself holds turns. Only what the edit changed is written: the old entry of the turn before
 * and of the turn after are compared, so a round trip through the kernel never rewrites what it did not touch.
 */
import { useMemo } from 'react';
import type { Turn } from '../game/actions';
import { legacyEntry, nestedEntries } from '../game/entry';
import { turnOf } from '../game/fromLegacy';
import type { Table } from '../game/types';
import type { DataPack, Entry, EntryBody, Game } from '../domain/types';
import { useGame } from './gameStore';

const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/** The fields of an old entry that differ between two of its states; a field the second lacks is written as undefined. */
export function entryPatch(before: Entry, after: Entry): Partial<EntryBody> {
  const patch: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'id') continue;
    const was = (before as unknown as Record<string, unknown>)[key];
    const now = (after as unknown as Record<string, unknown>)[key];
    if (!same(was, now)) patch[key] = now;
  }
  return patch as Partial<EntryBody>;
}

/** The entry with this id in the open plan of a game, and the free action a strategy card started (Warfare). */
export function entryAndLinked(game: Game, entryId: string): { entry: Entry; linked: Entry | undefined; round: number } | undefined {
  const plan = game.plans.find(p => p.id === game.activePlanId) ?? game.plans[0];
  for (const round of plan?.rounds ?? []) {
    const entry = round.entries.find(e => e.id === entryId);
    if (entry) return { entry, linked: round.entries.find(e => e.type === 'tactical' && e.fromCard === entryId), round: round.number };
  }
  return undefined;
}

export interface TurnWrite {
  /** The turn the entry is, with Warfare's free action nested in its card. */
  turn: Turn;
  /** Stores the changed turn: the fields that differ go to the store's actions. */
  update: (next: Turn) => void;
}

/** The write bridge over the store's actions, for the tests and for a hook. */
export function writeTurn(table: Table, game: Game, entryId: string, pack: DataPack): TurnWrite | undefined {
  const found = entryAndLinked(game, entryId);
  if (!found) return undefined;
  const turn = turnOf(table, found.entry, pack, found.linked);
  const update = (next: Turn): void => {
    const store = useGame.getState();
    const patch = entryPatch(legacyEntry(table, turn), legacyEntry(table, next));
    // The card is replaced first: a new card or side starts its free action over, as the store does.
    if (Object.keys(patch).length > 0) store.updateEntry(entryId, patch);
    if (turn.action.kind !== 'strategic' || next.action.kind !== 'strategic') return;
    const was = nestedEntries(table, turn)[0];
    const now = nestedEntries(table, next)[0];
    // The free action of the card is made or dropped with it.
    if (!now && found.linked) store.removeEntry(found.linked.id);
    if (now && !found.linked) {
      const { id: made, status, phase, ...body } = now;
      void made; void status;
      store.addEntry(found.round, body as EntryBody, phase, now.owner);
      return;
    }
    if (!now || !found.linked || !was) return;
    const nestedPatch = entryPatch(was, now);
    if (Object.keys(nestedPatch).length > 0) store.updateEntry(found.linked.id, nestedPatch);
  };
  return { turn, update };
}

/** The turn of an entry and its writer, for an editor; none while the entry is not in the open plan. */
export function useTurn(table: Table, entryId: string, pack: DataPack): TurnWrite | undefined {
  const game = useGame(s => s.game);
  return useMemo(() => (game ? writeTurn(table, game, entryId, pack) : undefined), [table, game, entryId, pack]);
}
