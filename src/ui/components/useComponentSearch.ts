import { useCallback } from 'react';
import { RESULT_LIMIT, searchComponents } from '../../domain/componentSearch';
import type { ComponentDef, ComponentKind, DataPack } from '../../domain/types';
import type { Table } from '../../game/types';
import { noteCardsOf } from '../../game/shelf';

export { RESULT_LIMIT, searchComponents };

/** The one search of components (`src/domain/componentSearch.ts`), limited to some kinds: the same for the drawer and for the picker. */
export function useComponentSearch(pack: DataPack, kinds?: ComponentKind[], among?: Set<string>, table?: Table): (query: string) => ComponentDef[] {
  return useCallback(query => searchComponents(pack, query, kinds, among, table && (def => noteCardsOf(table, pack, def))), [pack, kinds, among, table]);
}
