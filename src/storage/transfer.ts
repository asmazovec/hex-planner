import type { SavedGame } from '../game/save';
import { parseSaved } from './schema';

export type ImportResult =
  | { ok: true; saved: SavedGame }
  /** `oldFormat`: the file was saved by an earlier version of the app, which this one does not read. */
  | { ok: false; reason: 'invalidJson' | 'invalidSchema' | 'newerVersion' | 'oldFormat' };

export const exportGame = (saved: SavedGame): string => JSON.stringify(saved, null, 2);

/** Pure: never touches storage, so a failed import leaves saved games alone. */
export function importGame(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalidJson' };
  }
  const parsed = parseSaved(raw);
  if (parsed.ok) return parsed;
  return { ok: false, reason: parsed.kind === 'damaged' ? 'invalidSchema' : parsed.kind };
}

/** An imported game under an id no saved game has: its own when free, else the same with a time stamp after it. */
export const withFreeId = (saved: SavedGame, taken: string[], now: number = Date.now()): SavedGame =>
  (taken.includes(saved.id) ? { ...saved, id: `${saved.id}-${now.toString(36)}` } : saved);
