import { useCallback } from 'react';
import { RESULT_LIMIT, searchComponents } from '../../domain/componentSearch';
import type { ComponentDef, ComponentKind, DataPack, Game } from '../../domain/types';

export { RESULT_LIMIT, searchComponents };

/** The one search of components (`src/domain/componentSearch.ts`), limited to some kinds: the same for the drawer and for the picker. */
export function useComponentSearch(pack: DataPack, kinds?: ComponentKind[], among?: Set<string>, game?: Game | null): (query: string) => ComponentDef[] {
  return useCallback(query => searchComponents(pack, query, kinds, among, game), [pack, kinds, among, game]);
}
