/**
 * The entry-shaped writes the tests of the screens still make (`addEntry` and the like): each is the turn edit it stands for,
 * made from the body of an old entry. Goes with the old `Entry` (the last step of the move).
 */
import { loadPack } from '../data/loadPack';
import type { Phase } from '../domain/types';
import type { Entry, EntryBody } from './old/domain/types';
import type { Turn } from '../game/actions';
import { findTurn } from '../game/edit/plan';
import { factsOf } from '../game/turnFacts';
import { nestedEntries } from './old/game/entry';
import { turnOf } from './old/game/fromLegacy';
import type { SavedGame } from '../game/save';

/** The turn an entry body is, to be added to a round: its card when it is a free action a card gives (Warfare). */
export function turnOfBody(saved: SavedGame, id: string, body: EntryBody, phase: Phase, owner: string | undefined): { turn: Turn; parentId?: string } {
  const entry = { ...body, id, phase, status: 'planned', ...(owner ? { owner } : {}) } as Entry;
  const turn = turnOf(saved.table, entry, loadPack(saved.table.expansions));
  return { turn, ...(body.type === 'tactical' && body.fromCard ? { parentId: body.fromCard } : {}) };
}

/** The turn after a patch of the fields of the entry it is: another card or side starts the card's play over. */
export function patchedTurn(saved: SavedGame, id: string, patch: Partial<EntryBody>): Turn | undefined {
  const found = findTurn(saved.plans.find(p => p.id === saved.activePlanId)?.rounds ?? [], id);
  if (!found) return undefined;
  const { turn, parent } = found;
  const pack = loadPack(saved.table.expansions);
  const entry = factsOf(saved.table, turn);
  const was = entry as Entry & { card?: number };
  const replayed = (was.type === 'strategic' || was.type === 'secondary')
    && (('card' in patch && (patch as { card?: number }).card !== was.card) || ('type' in patch && patch.type !== was.type));
  const linked = turn.action.kind === 'strategic' && !replayed ? nestedEntries(saved.table, turn)[0] : undefined;
  const merged = { ...entry, ...patch } as Entry;
  void parent;
  return turnOf(saved.table, merged, pack, linked);
}
