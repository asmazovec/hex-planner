/**
 * The edits of the saved game that are still written over the old `Game` and its entries: the setup before the start
 * (players, layout, map, hand-placed units and control, docks, the expedition, the Fracture) and the entry-shaped writes
 * the tests of the screens still make. The store holds the saved game and calls these at its edges; each hands back the
 * saved game with everything it did not touch kept as it was. Goes with the old `Game` and `Entry` (the last step of the move).
 */
import { loadPack } from '../data/loadPack';
import type { DataPack, Entry, EntryBody, Game, Phase } from '../domain/types';
import type { Turn } from '../game/actions';
import { findTurn } from '../game/edit/plan';
import { legacyEntry, nestedEntries } from '../game/entry';
import { turnOf } from '../game/fromLegacy';
import type { SavedGame } from '../game/save';
import { gameOf, savedOf } from '../storage/legacySave';

const idsOf = (saved: SavedGame): string => saved.table.players.map(p => `${p.id}:${p.legacyId ?? ''}`).join();
const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The saved game after an edit written over the old game. Its table and start stay the same objects when they came out the
 * same, and so do the plans when the edit left them alone and nobody changed seats (a player's id is the seat).
 */
export function viaGame(saved: SavedGame, edit: (game: Game, pack: DataPack) => Game): SavedGame {
  const game = gameOf(saved);
  const next = edit(game, loadPack(game.expansions));
  if (next === game) return saved;
  const made = savedOf(next);
  const keepPlans = next.plans === game.plans && idsOf(made) === idsOf(saved);
  const result: SavedGame = {
    ...made,
    table: same(made.table, saved.table) ? saved.table : made.table,
    start: same(made.start, saved.start) ? saved.start : made.start,
    plans: keepPlans ? saved.plans : made.plans,
    activePlanId: keepPlans ? saved.activePlanId : made.activePlanId,
  };
  return same(result, saved) ? saved : result;
}

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
  const entry = legacyEntry(saved.table, turn);
  const was = entry as Entry & { card?: number };
  const replayed = (was.type === 'strategic' || was.type === 'secondary')
    && (('card' in patch && (patch as { card?: number }).card !== was.card) || ('type' in patch && patch.type !== was.type));
  const linked = turn.action.kind === 'strategic' && !replayed ? nestedEntries(saved.table, turn)[0] : undefined;
  const merged = { ...entry, ...patch } as Entry;
  void parent;
  return turnOf(saved.table, merged, pack, linked);
}
