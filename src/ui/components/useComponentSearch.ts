import { useCallback } from 'react';
import { componentById, componentsOf } from '../../domain/components';
import { buildIndex, search, type SearchIndex } from '../../domain/fuzzy';
import type { ComponentDef, ComponentKind, DataPack } from '../../domain/types';

/** How many results a search shows. */
export const RESULT_LIMIT = 30;

const INDEXES = new WeakMap<DataPack, SearchIndex>();
/** The index of a pack's components, built once for the pack. */
function indexOf(pack: DataPack): SearchIndex {
  let index = INDEXES.get(pack);
  if (!index) INDEXES.set(pack, index = buildIndex(componentsOf(pack).map(({ id, name, text }) => ({ id, name, text }))));
  return index;
}

/** The components of the pack a query finds by name and text, best first, of the given kinds and among the given ids only; none for an empty query. */
export function searchComponents(pack: DataPack, query: string, kinds?: ComponentKind[], among?: Set<string>): ComponentDef[] {
  if (query.trim() === '') return [];
  const found: ComponentDef[] = [];
  for (const { id } of search(indexOf(pack), query)) {
    const component = componentById(pack, id);
    if (!component || (kinds && !kinds.includes(component.kind)) || (among && !among.has(id))) continue;
    found.push(component);
    if (found.length === RESULT_LIMIT) break;
  }
  return found;
}

/** The search over a pack's components, limited to some kinds: the same for the drawer and for the picker. */
export function useComponentSearch(pack: DataPack, kinds?: ComponentKind[], among?: Set<string>): (query: string) => ComponentDef[] {
  return useCallback(query => searchComponents(pack, query, kinds, among), [pack, kinds, among]);
}
