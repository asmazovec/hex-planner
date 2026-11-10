/** The undo steps of the open game: the games as they stood before each edit, the latest last. */
import type { Game } from '../domain/types';

const LIMIT = 50;

let steps: Game[] = [];

/** Keeps the game as it stood before an edit; beyond the limit the oldest step goes. */
export function push(game: Game): void {
  steps = [...steps.slice(-(LIMIT - 1)), game];
}

/** Takes the latest step back, or nothing when there is none. */
export function pop(): Game | undefined {
  const last = steps.at(-1);
  if (last) steps = steps.slice(0, -1);
  return last;
}

export function clear(): void {
  steps = [];
}

export const size = (): number => steps.length;
