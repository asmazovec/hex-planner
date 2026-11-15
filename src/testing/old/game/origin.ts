import type { Game } from '../domain/types';
import type { Table } from '../../../game/types';

/** The old game a table was made from, with every field the old game has; the application is told only the start of the game (`STARTS`). */
export const ORIGINS = new WeakMap<Table, Game>();
