import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../testing/old/domain/newGame';
import { setPlayerFaction } from '../testing/old/domain/players';
import { startOf } from '../testing/old/domain/replay/start';
import { applyAll } from './apply';
import { normalState } from '../testing/old/game/compare';
import { boardFromLegacy, boardOf, legacyState, tableOf } from '../testing/old/game/fromLegacy';
import { legacyEvents, legacyGame, legacyKey, legacyViews } from '../testing/old/game/legacyViews';

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

describe('the wormhole tokens and the Thunder\'s Edge slot, as the old replay changes them', () => {
  const game = fourPlayers();
  const table = tableOf(game);
  const slots = Object.keys(game.map).filter(s => s !== '0,0');

  test('a token that changes system is one move, not a new token beside the old', () => {
    const start = boardOf(game, pack);
    const old = legacyViews(table, start, pack);
    const first = structuredClone(old);
    (first.states.me as { wormholeTokens?: Record<string, string> }).wormholeTokens = { gamma: slots[0] };
    const placed = applyAll(start, legacyEvents(table, pack, old, first, table.viewer));
    expect(placed.common.wormholeTokens).toEqual({ [slots[0]]: ['gamma'] });
    const second = structuredClone(first);
    (second.states.me as { wormholeTokens?: Record<string, string> }).wormholeTokens = { gamma: slots[1] };
    const events = legacyEvents(table, pack, first, second, table.viewer);
    expect(events.map(e => e.type)).toEqual(['WormholeTokenMoved']);
    expect(applyAll(placed, events).common.wormholeTokens).toEqual({ [slots[1]]: ['gamma'] });
  });

  test('the Thunder\'s Edge slot of the game is a fact of the board it begins from', () => {
    const placed = { ...game, expedition: { ...game.expedition, thundersEdgeSystem: slots[2] } };
    const board = boardOf(placed, pack);
    expect(board.common.thundersEdge).toBe(slots[2]);
    expect(legacyGame(tableOf(placed), board).expedition.thundersEdgeSystem).toBe(slots[2]);
  });
});
