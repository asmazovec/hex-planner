import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { setPlayerFaction } from '../domain/players';
import { startOf } from '../domain/replay/timeline';
import { normalState } from './compare';
import { boardFromLegacy, boardOf, legacyState, tableOf } from './fromLegacy';
import { legacyKey } from './legacyViews';

const pack = loadPack(['pok', 'te']);
const FACTIONS = ['sol', 'hacan', 'arborec', 'letnev'];
function fourPlayers() {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 4, faction: 'sol' }, pack);
  FACTIONS.slice(1).forEach((faction, i) => { game = setPlayerFaction(game, i + 1, faction, pack); });
  return game;
}

describe('a board in the old model and back', () => {
  const game = fourPlayers();
  const table = tableOf(game);

  test('the start of an old game, as a board, reads back as the same states', () => {
    const state = startOf(game, pack);
    const board = boardFromLegacy(table, state, pack);
    expect(normalState(legacyState(table, board, pack, table.viewer))).toEqual(normalState(state));
  });

  test('boardOf takes what is placed by hand: a rival unit, a dock, a held planet', () => {
    const slot = Object.keys(game.map).find(s => s !== '0,0')!;
    const opponent = game.opponents[0];
    const placed = { ...game, enemyUnits: { ...game.enemyUnits, [slot]: { ...game.enemyUnits[slot], [opponent.id]: { cruiser: 2 } } } };
    const board = boardOf(placed, pack);
    const t = tableOf(placed);
    expect(board.systems[slot].ships[t.players.find(p => p.legacyId === opponent.id)!.id]).toEqual({ cruiser: 2 });
    expect(normalState(legacyState(t, board, pack, t.viewer))).toEqual(normalState(startOf(placed, pack)));
  });

  test('every player is seen under the old key: me for the viewer', () => {
    expect(table.players.map(p => legacyKey(table, p.id))).toEqual(['me', ...game.opponents.map(o => o.id)]);
  });
});
