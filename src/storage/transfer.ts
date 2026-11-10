import type { Game } from '../domain/types';
import { parseGame } from './schema';

export type ImportResult =
  | { ok: true; game: Game }
  /** `oldFormat`: the file was saved by an earlier version of the app, which this one does not read. */
  | { ok: false; reason: 'invalidJson' | 'invalidSchema' | 'newerVersion' | 'oldFormat' };

export const exportGame = (game: Game): string => JSON.stringify(game, null, 2);

/** Pure: never touches storage, so a failed import leaves saved games alone. */
export function importGame(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalidJson' };
  }
  const parsed = parseGame(raw);
  if (parsed.ok) return parsed;
  return { ok: false, reason: parsed.kind === 'damaged' ? 'invalidSchema' : parsed.kind };
}

/** An imported game under an id no saved game has: its own when free, else the same with a time stamp after it. */
export const withFreeId = (game: Game, taken: string[], now: number = Date.now()): Game =>
  (taken.includes(game.id) ? { ...game, id: `${game.id}-${now.toString(36)}` } : game);
