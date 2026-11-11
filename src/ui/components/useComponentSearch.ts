import { useCallback } from 'react';
import { componentById, componentsOf, noteBase } from '../../domain/components';
import { buildIndex, search, type SearchIndex } from '../../domain/fuzzy';
import { noteCards } from '../../domain/holdings';
import type { ComponentDef, ComponentKind, DataPack, Game } from '../../domain/types';

/** How many results a search shows. */
export const RESULT_LIMIT = 30;

const INDEXES = new WeakMap<DataPack, SearchIndex>();
/** The index of a pack's components, built once for the pack. */
function indexOf(pack: DataPack): SearchIndex {
  let index = INDEXES.get(pack);
  if (!index) INDEXES.set(pack, index = buildIndex(componentsOf(pack).map(({ id, name, text }) => ({ id, name, text }))));
  return index;
}

/**
 * The components of the pack a query finds by name and text, best first, of the given kinds and among the given ids
 * only; none for an empty query. A promissory note found is the cards it stands for: those among the ids, or else one
 * of each player of the game.
 */
export function searchComponents(pack: DataPack, query: string, kinds?: ComponentKind[], among?: Set<string>, game?: Game | null): ComponentDef[] {
  if (query.trim() === '') return [];
  const found: ComponentDef[] = [];
  for (const { id } of search(indexOf(pack), query)) {
    const component = componentById(pack, id);
    if (!component || (kinds && !kinds.includes(component.kind))) continue;
    const cards = among ? [...among].filter(other => noteBase(other) === id).flatMap(other => componentById(pack, other) ?? [])
      : game ? noteCards(game, pack, component) : [component];
    found.push(...cards);
    if (found.length >= RESULT_LIMIT) break;
  }
  return found.slice(0, RESULT_LIMIT);
}

/** The search over a pack's components, limited to some kinds: the same for the drawer and for the picker. */
export function useComponentSearch(pack: DataPack, kinds?: ComponentKind[], among?: Set<string>, game?: Game | null): (query: string) => ComponentDef[] {
  return useCallback(query => searchComponents(pack, query, kinds, among, game), [pack, kinds, among, game]);
}
