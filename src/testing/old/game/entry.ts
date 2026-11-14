import type { Table } from '../../../game/types';
import type { Turn } from '../../../game/actions';
import type { Entry } from '../../../domain/types';
import { legacyEntry } from '../../../game/entry';

/** The old entries a strategic turn's nested actions were made from (Warfare's free action, `fromCard` the card). */
export const nestedEntries = (table: Table, turn: Turn): Entry[] =>
  turn.action.kind === 'strategic' ? (turn.action.nested ?? []).map(n => ({ ...legacyEntry(table, n), fromCard: turn.id }) as Entry) : [];
