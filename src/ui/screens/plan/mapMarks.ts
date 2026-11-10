/**
 * What the plan screen marks on the map: the arrows of the round's tactical actions, and the light of each tile. The
 * rules of what fits come from the domain; here only their order and tone.
 */
import { arrowsOf, entrySystems, sourcesOf, viaOf, type TacticalEntry } from '../../../domain/tactical';
import { systemsAdjacent } from '../../../domain/project';
import type { DataPack, Entry, Game } from '../../../domain/types';
import { routeShapes } from '../../map/geometry';
import type { Arrow } from '../../map/RouteArrows';
import type { Highlight } from '../../map/TileView';

/**
 * The arrows of the round: the action in focus, those done, and every planned one too unless the map shows only what
 * is done ("now") and no action is being edited. A cancelled action draws none. `leaving` holds the keys of the arrows
 * whose sources are on their way out: they fade.
 */
export function planArrows(
  game: Game, pack: DataPack, tacticals: TacticalEntry[], numbers: Record<string, number>, focusId: string | undefined, showPlanned: boolean,
  leaving: string[] = [],
): Arrow[] {
  const drawn = tacticals.filter(item => item.status !== 'cancelled' && (item.id === focusId || item.status === 'done' || showPlanned))
    .flatMap(item => arrowsOf(game, pack, item).map(a => ({
      ...a, key: `${item.id}:${a.from}`, number: numbers[item.id], player: game.opponents.find(o => o.id === item.owner)?.color,
      tone: item.id === focusId ? 'active' as const : item.status === 'done' ? 'done' as const : 'planned' as const,
    })));
  const shapes = routeShapes(drawn.map(a => [a.from, ...a.via, a.to]), systemsAdjacent(game));
  return drawn.map((a, i) => ({ ...a, shape: shapes[i], ...(leaving.includes(a.key) ? { leaving: true } : {}) }));
}

export interface HighlightInput {
  /** The systems the map is choosing among now: for a card, a manual adjustment, Thunder's Edge or a tactical action. */
  choice: string[];
  /** The systems the entry being read speaks of, when it is not a tactical action. */
  shownSystems: string[];
  /** The tactical action in focus, edited or read. */
  focused: TacticalEntry | undefined;
  /** The route under way. */
  path: string[];
  /** Where the route under way can still go, and the systems that fit the choice of a tactical action; lit only where nothing else is. */
  reach: Iterable<string>;
  options: string[];
}

/**
 * The light of each tile, by an explicit order where several apply: what the map chooses among, then what the entry
 * being read speaks of, then the active system, the sources and the ways of the action in focus with the route under
 * way, and last where that route can still go and what else fits.
 */
export function mapHighlights(game: Game, pack: DataPack, { choice, shownSystems, focused, path, reach, options }: HighlightInput): Record<string, Highlight> {
  const sources = focused?.systemId ? sourcesOf(game, pack, focused) : [];
  const layers: [Iterable<string>, Highlight][] = [
    [choice, 'valid'],
    [shownSystems, 'active'],
    [focused?.systemId ? [focused.systemId] : [], 'active'],
    [sources, 'source'],
    [[...path, ...(focused ? sources.flatMap(source => viaOf(focused, source)) : [])], 'path'],
    [reach, 'valid'],
    [options, 'valid'],
  ];
  const highlights: Record<string, Highlight> = {};
  for (const [slots, tone] of layers) for (const slot of slots) highlights[slot] ??= tone;
  return highlights;
}

/** The systems an entry other than a tactical action speaks of, lit while it is read: the camera alone does not say which ones. */
export const shownSystemsOf = (game: Game, pack: DataPack, shown: Entry | undefined): string[] =>
  (shown && shown.type !== 'tactical' ? entrySystems(game, pack, shown) : []);
