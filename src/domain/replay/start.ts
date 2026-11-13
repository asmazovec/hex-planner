/** Where a game begins: my state with the opponents' as they stand on the map. The same for the old replay and for the board of the kernel. */
import { gameAs } from '../players';
import type { DataPack, Game, GameState } from '../types';
import { initialState } from './state';
import { keepOwnStructures } from './structures';

/** An opponent counted like me: what stands on the map for them is where they begin. */
function rivalState(game: Game, view: Game, id: string, pack: DataPack): GameState {
  const pick = (record: Game['enemyUnits']) => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => (byOwner[id] ? [[place, { ...byOwner[id] }]] : [])));
  // The laws, the revealed objectives and the attachments are the whole game's: they stand on my state only.
  const { laws, revealed, attachments, ...own } = initialState(view, pack);
  void laws; void revealed; void attachments;
  const state: GameState = { ...own, faction: view.faction, systems: pick(game.enemyUnits), ground: pick(game.enemyGround) };
  keepOwnStructures(state, false);
  return state;
}

export function startOf(game: Game, pack: DataPack): GameState {
  const state = initialState(game, pack);
  state.faction = game.faction;
  keepOwnStructures(state, true);
  if (game.opponents.length > 0) {
    state.rivals = Object.fromEntries(game.opponents.map(o => [o.id, rivalState(game, gameAs(game, o.id), o.id, pack)]));
    state.rivalHolds = {};
  }
  return state;
}
