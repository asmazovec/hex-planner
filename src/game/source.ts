import type { Game } from '../domain/types';
import type { Table } from './types';

/** The game a table came from, kept for the fields the table and board have no place for yet (ingress, the Thunder's Edge system). */
export const SOURCES = new WeakMap<Table, Game>();
