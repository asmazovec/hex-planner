/**
 * The entry-shaped writes the tests still make (`addEntry` and the like): each is the turn edit of the store it stands for,
 * made from the body of an old entry. The store itself holds only the kernel's turn edits.
 */
import { useGame } from '../state/gameStore';
import type { EntryBody, EntryStatus, Phase } from '../domain/types';
import { patchedTurn, turnOfBody } from './legacyEdits';

export function addEntry(roundNo: number, body: EntryBody, phase: Phase, owner?: string): string {
  const saved = useGame.getState().saved;
  if (!saved) return '';
  const { turn, parentId } = turnOfBody(saved, '', body, phase, owner);
  return useGame.getState().addTurn(roundNo, turn, parentId);
}

export const addStatusEntry = (roundNo: number): string => useGame.getState().addStatusTurn(roundNo);

export function updateEntry(id: string, patch: Partial<EntryBody>): void {
  const saved = useGame.getState().saved;
  const next = saved ? patchedTurn(saved, id, patch) : undefined;
  if (next) useGame.getState().updateTurn(id, next);
}

export const moveEntry = (id: string, toPhase: Phase, toIndex: number): void => useGame.getState().moveTurn(id, toPhase, toIndex);
export const removeEntry = (id: string): void => useGame.getState().removeTurn(id);
export const setEntryStatus = (id: string, status: EntryStatus): void => useGame.getState().setStatus(id, status);
