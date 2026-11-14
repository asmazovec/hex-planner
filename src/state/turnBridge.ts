/**
 * The write side of the bridge between the kernel's turns and the stored entries: an editor works on the `Turn` of an
 * entry and hands the changed turn back; here it is turned into the patch of old entry fields that the store takes, in
 * one place, until the store itself holds turns. Only what the edit changed is written: the old entry of the turn before
 * and of the turn after are compared, so a round trip through the kernel never rewrites what it did not touch.
 */
import { useMemo } from 'react';
import type { Turn } from '../game/actions';
import { legacyEntry, nestedEntries, playerOfLegacy } from '../game/entry';
import { newTurn, type NewAction } from '../game/edit/new';
import { withoutEmptySources } from '../game/edit/tactical';
import { atOf } from '../game/edit/tacticalRead';
import { timelineOf } from './projection';
import { planOf, turnOf } from '../game/fromLegacy';
import type { Table } from '../game/types';
import type { DataPack, Entry, EntryBody, EntryStatus, Game, Phase } from '../domain/types';
import { loadPack } from '../data/loadPack';
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

/** A new tactical action on a system, stored as the body the store keeps: `owner` is the old key of whose it is, `fromCard` the card that gives it (Warfare). Returns its id. */
export function addTactical(table: Table, roundNumber: number, system: string, owner: string | undefined, fromCard: string | undefined): string {
  const player = (owner === undefined ? undefined : playerOfLegacy(table, owner)) ?? table.viewer;
  const round = { number: roundNumber, strategyCard: null, backupCard: null, held: [], turns: [] };
  const turn = newTurn('tactical', { id: '', player, viewer: player, round }, { system, ...(fromCard ? { fromCard } : {}) });
  const { id, status, phase, owner: made, acts, ...body } = legacyEntry(table, turn) as Entry & { acts?: unknown[] };
  void id; void status; void made;
  return useGame.getState().addEntry(roundNumber, { ...body, ...(acts && acts.length > 0 ? { acts } : {}), ...(fromCard ? { fromCard } : {}) } as EntryBody, phase, owner);
}

/** A source with nothing chosen goes when the editor closes. Works on the store, for it runs on unmount too. */
export function pruneEmptySources(entryId: string | undefined): void {
  const { game } = useGame.getState();
  if (!game || !entryId) return;
  const pack = loadPack(game.expansions);
  const plan = game.plans.find(p => p.id === game.activePlanId) ?? game.plans[0];
  const { kernel } = timelineOf(game, plan, 'forecast', pack);
  const write = writeTurn(kernel.table, game, entryId, pack);
  if (!write || write.turn.action.kind !== 'tactical') return;
  write.update(withoutEmptySources(atOf(kernel.table, kernel.byTurn.get(entryId)?.before ?? kernel.end, pack), write.turn));
}

/**
 * A new turn of a kind other than a tactical action, in a round of the open plan: its body is the kernel's `newTurn`
 * (a strategy card starts on the card the viewer holds and has not played), stored as the body the store keeps.
 * `owner` is the old key of whose it is. Returns its id.
 */
export function addTurn(table: Table, roundNumber: number, kind: Exclude<NewAction, 'tactical'>, owner: string | undefined, phase?: Phase): string {
  const store = useGame.getState();
  const game = store.game;
  const plan = game?.plans.find(p => p.id === game.activePlanId) ?? game?.plans[0];
  const round = game && plan ? planOf(table, plan, loadPack(game.expansions)).find(r => r.number === roundNumber) : undefined;
  const player = (owner === undefined ? undefined : playerOfLegacy(table, owner)) ?? table.viewer;
  const turn = newTurn(kind, { id: '', player, viewer: table.viewer, round: round ?? { number: roundNumber, strategyCard: null, backupCard: null, held: [], turns: [] }, ...(phase ? { phase } : {}) });
  const { id, status, phase: placed, owner: made, acts, ...body } = legacyEntry(table, turn) as Entry & { acts?: unknown[] };
  void id; void status; void made;
  return store.addEntry(roundNumber, { ...body, ...(acts && acts.length > 0 ? { acts } : {}) } as EntryBody, placed, owner);
}

/** The status turn of a round: the one it already has, or a new one with no tokens taken. */
export const addStatusTurn = (roundNumber: number): string => useGame.getState().addStatusEntry(roundNumber);

/** Marks a turn done, planned again or cancelled. */
export const setStatus = (turnId: string, status: EntryStatus): void => useGame.getState().setEntryStatus(turnId, status);

/** Takes a turn out of its round; Warfare's free action goes with its card. */
export const removeTurn = (turnId: string): void => useGame.getState().removeEntry(turnId);

/** Puts a turn at a place among those of its phase. */
export const moveTurn = (turnId: string, phase: Phase, toIndex: number): void => useGame.getState().moveEntry(turnId, phase, toIndex);
