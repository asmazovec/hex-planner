import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Game } from '../domain/types';
import { errorText } from './errorText';
import { gameSchema, migrate } from './schema';

/** `broken`: the save is there but does not read as a game. It is listed so it can be exported or deleted, never dropped. */
export interface GameSummary { id: string; name?: string; faction: string; playerCount: number; updatedAt: number; broken?: true; }

interface StoredGame { id: string; name?: string; faction: string; playerCount: number; updatedAt: number; game: Game; }
interface Ti4DB extends DBSchema { games: { key: string; value: StoredGame }; }

/** A save that is in the database but cannot be opened: it failed to read, to migrate or to pass the schema. */
export class BrokenSaveError extends Error {
  constructor(readonly id: string, readonly reason: string) {
    super(reason);
    this.name = 'BrokenSaveError';
  }
}

let dbPromise: Promise<IDBPDatabase<Ti4DB>> | null = null;
/** A failed or terminated connection is dropped so the next call reopens the database. */
function db(): Promise<IDBPDatabase<Ti4DB>> {
  if (!dbPromise) {
    const opening = openDB<Ti4DB>('ti4-planner', 1, {
      upgrade: d => void d.createObjectStore('games', { keyPath: 'id' }),
      terminated: () => { if (dbPromise === opening) dbPromise = null; },
    });
    dbPromise = opening;
    opening.catch(() => { if (dbPromise === opening) dbPromise = null; });
  }
  return dbPromise;
}


/** The stored game brought up to the current schema, or why it cannot be. Never throws. */
function readGame(stored: unknown): { ok: true; game: Game } | { ok: false; reason: string } {
  const raw = typeof stored === 'object' && stored !== null ? (stored as { game?: unknown }).game : undefined;
  if (raw === undefined) return { ok: false, reason: 'no game in the save' };
  try {
    const parsed = gameSchema.safeParse(migrate(raw));
    if (parsed.success) return { ok: true, game: parsed.data };
    const issue = parsed.error.issues[0];
    return { ok: false, reason: issue ? `${issue.path.join('.') || 'game'}: ${issue.message}` : 'invalid save' };
  } catch (error) {
    return { ok: false, reason: errorText(error) };
  }
}

export async function saveGame(game: Game): Promise<void> {
  const { id, name, faction, playerCount } = game;
  await (await db()).put('games', { id, name, faction, playerCount, updatedAt: Date.now(), game });
}

/** Null when there is no such save; a save that is there but does not read throws `BrokenSaveError`. */
export async function loadGame(id: string): Promise<Game | null> {
  const d = await db();
  let stored: StoredGame | undefined;
  try {
    stored = await d.get('games', id);
  } catch (error) {
    throw new BrokenSaveError(id, errorText(error));
  }
  if (stored === undefined) return null;
  const read = readGame(stored);
  if (!read.ok) throw new BrokenSaveError(id, read.reason);
  return read.game;
}

/** The save as it lies in the database, for a file copy of one that cannot be opened. Undefined when there is none. */
export async function loadRawGame(id: string): Promise<unknown> {
  return (await db()).get('games', id);
}

function summaryOf(id: string, stored: unknown): GameSummary {
  const s = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>;
  const summary: GameSummary = {
    id,
    ...(typeof s.name === 'string' ? { name: s.name } : {}),
    faction: typeof s.faction === 'string' ? s.faction : '',
    playerCount: typeof s.playerCount === 'number' ? s.playerCount : 0,
    updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0,
  };
  return readGame(stored).ok ? summary : { ...summary, broken: true };
}

/** Most recently saved first. Each save is read on its own: one that fails is listed as broken and the rest still are. */
export async function listGames(): Promise<GameSummary[]> {
  const d = await db();
  const keys = await d.getAllKeys('games');
  const all = await Promise.all(keys.map(async (id): Promise<GameSummary> => {
    try {
      return summaryOf(id, await d.get('games', id));
    } catch {
      return { id, faction: '', playerCount: 0, updatedAt: 0, broken: true };
    }
  }));
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteGame(id: string): Promise<void> {
  await (await db()).delete('games', id);
}

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
