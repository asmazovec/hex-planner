/**
 * The writers of the editors over the store: an editor works on the `Turn` it reads from the open plan and hands the
 * changed turn back; the store replaces it. A turn the plan holds is the stored object itself, so it stays the same
 * object until an edit changes it. Warfare's free action is nested in its card: asked for by its own id, it comes back
 * with its writer replacing it inside the card.
 */
import { useMemo } from 'react';
import type { Turn } from '../game/actions';
import { findTurn } from '../game/edit/plan';
import { newTurn, type NewAction } from '../game/edit/new';
import { withoutEmptySources } from '../game/edit/tactical';
import { atOf } from '../game/edit/tacticalRead';
import type { SavedGame } from '../game/save';
import { timelineOf } from './projection';
import { playerOfLegacy } from '../game/entry';
import type { Table } from '../game/types';
import type { DataPack, EntryStatus, Phase } from '../domain/types';
import { loadPack } from '../data/loadPack';
import { useGame } from './gameStore';

export interface TurnWrite {
  /** The turn as the open plan holds it, with Warfare's free action nested in its card. */
  turn: Turn;
  /** Stores the changed turn. */
  update: (next: Turn) => void;
}

const roundsOf = (saved: SavedGame) => (saved.plans.find(p => p.id === saved.activePlanId) ?? saved.plans[0])?.rounds ?? [];

/** The turn with this id in the open plan of a saved game and its writer. */
export function writeSaved(saved: SavedGame, turnId: string): TurnWrite | undefined {
  const found = findTurn(roundsOf(saved), turnId);
  return found ? { turn: found.turn, update: next => useGame.getState().updateTurn(turnId, next) } : undefined;
}

/** The turn of an entry and its writer, for an editor; none while it is not in the open plan. */
export function useTurn(...[, turnId]: [table: Table, turnId: string, pack: DataPack]): TurnWrite | undefined {
  const saved = useGame(s => s.saved);
  return useMemo(() => (saved ? writeSaved(saved, turnId) : undefined), [saved, turnId]);
}

/** A new tactical action on a system: `owner` is the old key of whose it is, `fromCard` the card that gives it (Warfare, nested in it). Returns its id. */
export function addTactical(table: Table, roundNumber: number, system: string, owner: string | undefined, fromCard: string | undefined): string {
  const player = (owner === undefined ? undefined : playerOfLegacy(table, owner)) ?? table.viewer;
  const round = { number: roundNumber, strategyCard: null, backupCard: null, held: [], turns: [] };
  const turn = newTurn('tactical', { id: '', player, viewer: player, round }, { system, ...(fromCard ? { fromCard } : {}) });
  return useGame.getState().addTurn(roundNumber, turn, fromCard);
}

/** A source with nothing chosen goes when the editor closes. Works on the store, for it runs on unmount too. */
export function pruneEmptySources(entryId: string | undefined): void {
  const { saved } = useGame.getState();
  if (!saved || !entryId) return;
  const pack = loadPack(saved.table.expansions);
  const kernel = timelineOf(saved, saved.activePlanId, 'forecast', pack);
  const write = writeSaved(saved, entryId);
  if (!write || write.turn.action.kind !== 'tactical') return;
  write.update(withoutEmptySources(atOf(kernel.table, kernel.byTurn.get(entryId)?.before ?? kernel.end, pack), write.turn));
}

/**
 * A new turn of a kind other than a tactical action, in a round of the open plan: its body is the kernel's `newTurn`
 * (a strategy card starts on the card the viewer holds and has not played). `owner` is the old key of whose it is.
 * Returns its id.
 */
export function addTurn(table: Table, roundNumber: number, kind: Exclude<NewAction, 'tactical'>, owner: string | undefined, phase?: Phase): string {
  const store = useGame.getState();
  const round = roundsOf(store.saved!).find(r => r.number === roundNumber);
  const player = (owner === undefined ? undefined : playerOfLegacy(table, owner)) ?? table.viewer;
  const turn = newTurn(kind, { id: '', player, viewer: table.viewer, round: round ?? { number: roundNumber, strategyCard: null, backupCard: null, held: [], turns: [] }, ...(phase ? { phase } : {}) });
  return store.addTurn(roundNumber, turn);
}

/** The status turn of a round: the one it already has, or a new one with no tokens taken. */
export const addStatusTurn = (roundNumber: number): string => useGame.getState().addStatusTurn(roundNumber);

/** Marks a turn done, planned again or cancelled. */
export const setStatus = (turnId: string, status: EntryStatus): void => useGame.getState().setStatus(turnId, status);

/** Takes a turn out of its round; Warfare's free action goes with its card. */
export const removeTurn = (turnId: string): void => useGame.getState().removeTurn(turnId);

/** Puts a turn at a place among those of its phase. */
export const moveTurn = (turnId: string, phase: Phase, toIndex: number): void => useGame.getState().moveTurn(turnId, phase, toIndex);
