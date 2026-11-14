import type { TFunction } from 'i18next';
import { noteAddress, textOf } from '../../domain/components';
import type { DataPack } from '../../domain/types';
import { legacyKey } from '../../game/keys';
import type { Table } from '../../game/types';
import { shortName } from '../players/names';

/** Whose card a promissory note is, for `ComponentCard`: the owner's short name and colour, and the text with the owner in it. */
export interface NoteMark {
  owner?: { name: string; color: number };
  text?: string;
}

/**
 * How a note held, played or handed over shows whose it is: the owner is the player of the table the note is addressed
 * to (`me` or an opponent id, or the kernel's id). Nothing for any other component, and for a note without an address
 * or to nobody at the table. The text of the note says the owner by name in place of `<color>`.
 */
export function noteMark(table: Table, pack: DataPack, id: string, t: TFunction): NoteMark {
  const address = noteAddress(id);
  const owner = address === undefined ? undefined : table.players.find(p => p.id === address || legacyKey(table, p.id) === address);
  if (owner === undefined) return {};
  const name = shortName(pack, owner.faction, t('players.player', { n: owner.seat }));
  return { owner: { name, color: owner.color }, text: textWith(pack, id, name) };
}

const textWith = (pack: DataPack, id: string, name: string): string => textOf(pack, id).replaceAll('<color>', name);
