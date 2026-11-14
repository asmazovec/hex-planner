/** The meters of a source of a tactical entry as the kernel reads them, over a game and a state of the old shape: for the tests that pin the numbers of the flight screen. */
import { turnOf } from './old/game/fromLegacy';
import { viewOf } from '../ui/testing/legacyMap';
import { flightOf, metersOf, type Meters } from '../game/flight';
import { playerOfKey } from '../game/keys';
import type { DataPack } from '../domain/types';
import type { Entry, Game } from './old/domain/types';
import type { GameState } from './old/domain/types';

export function tacticalMeters(game: Game, entry: Extract<Entry, { type: 'tactical' }>, source: string, before: GameState, pack: DataPack): Meters {
  const { table, board } = viewOf(game, before, pack);
  const turn = turnOf(table, entry, pack);
  return metersOf(table, pack, flightOf(table, board, pack, turn), playerOfKey(table, entry.owner ?? 'me') ?? table.viewer, source);
}
