import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { setPlayerFaction } from '../domain/players';
import { startOf } from '../domain/replay/timeline';
import { applyAll } from './apply';
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

describe('a note laid in the play area (LRR 69.3)', () => {
  const game = fourPlayers();
  const table = tableOf(game);
  const note = 'promissory:convoys@o1';

  test('the play area of the old holdings is a state of the card on the board, both ways', () => {
    const state = startOf(game, pack);
    state.holdings.promissory.push(note);
    state.holdings.inPlay = [note];
    const board = boardFromLegacy(table, state, pack);
    expect(board.players[table.viewer].cards[note]?.state).toBe('inPlay');
    expect(legacyState(table, board, pack, table.viewer).holdings.inPlay).toEqual([note]);
  });

  test('a note played from the hand is an event: it lies in the play area, it is not exhausted and not lost', () => {
    const board = boardFromLegacy(table, startOf(game, pack), pack);
    const held = applyAll(board, [{ type: 'CardGained', player: table.viewer, card: note }, { type: 'CardLaidInPlay', player: table.viewer, card: note }]);
    expect(held.players[table.viewer].cards[note]).toEqual({ state: 'inPlay', count: 1 });
    const back = applyAll(held, [{ type: 'CardTakenBack', player: table.viewer, card: note }]);
    expect(back.players[table.viewer].cards[note]).toEqual({ state: 'ready', count: 1 });
  });
});
