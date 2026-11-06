import type { Game } from '../domain/types';
import { CURRENT_SCHEMA, gameSchema, migrate } from './schema';

export { CURRENT_SCHEMA, migrate };

export type ImportResult =
  | { ok: true; game: Game }
  | { ok: false; reason: 'invalidJson' | 'invalidSchema' | 'newerVersion' };

export const exportGame = (game: Game): string => JSON.stringify(game, null, 2);

/** Pure: never touches storage, so a failed import leaves saved games alone. */
export function importGame(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalidJson' };
  }
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA) return { ok: false, reason: 'newerVersion' };
  const parsed = gameSchema.safeParse(migrate(raw));
  return parsed.success ? { ok: true, game: parsed.data } : { ok: false, reason: 'invalidSchema' };
}
