import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Game } from '../domain/types';

export interface GameSummary { id: string; faction: string; playerCount: number; updatedAt: number; }

interface StoredGame extends GameSummary { game: Game; }
interface Ti4DB extends DBSchema { games: { key: string; value: StoredGame }; }

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

export async function saveGame(game: Game): Promise<void> {
  const { id, faction, playerCount } = game;
  await (await db()).put('games', { id, faction, playerCount, updatedAt: Date.now(), game });
}

export async function loadGame(id: string): Promise<Game | null> {
  return (await (await db()).get('games', id))?.game ?? null;
}

/** Most recently saved first. */
export async function listGames(): Promise<GameSummary[]> {
  const all = await (await db()).getAll('games');
  return all
    .map(({ id, faction, playerCount, updatedAt }) => ({ id, faction, playerCount, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
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
