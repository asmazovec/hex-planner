import type { Player } from './players';
import type { ExpansionId, MapLayout } from './types';

/**
 * What the map, seat and layout code reads of a game, by name: the fields of the table that the counting layer asks for
 * (the map, who sits where, the layout, the Fracture, the expedition, what stands on the planets at the start). The
 * kernel builds one from a table (`mapSource` in src/game/space.ts); a test may pass any value that has the fields.
 */
export interface TableFacts {
  expansions: ExpansionId[];
  playerCount: number;
  layout: MapLayout;
  faction: string;
  seat: number;
  /** Slot key to `<tileId>` or `<tileId>@<rotation 0-5>`. */
  map: Record<string, string>;
  opponents: Player[];
  /** Planet id to opponent id, only for enemy planets. */
  planetOwner: Record<string, string>;
  /** Ids of planets that have a space dock at the start. */
  docks: string[];
  /** Planet id to the number of PDS on it at the start. */
  pds: Record<string, number>;
  expedition: { slices: Record<string, 'me' | 'other' | null>; thundersEdgeSystem: string | null };
  fracture: { active: boolean; ingress: string[]; /** Chosen seat; null puts the group at the default edge. */ seat: number | null;
    /** While open: slot key beside the map to its Fracture tile. */ tiles?: Record<string, string> };
}
