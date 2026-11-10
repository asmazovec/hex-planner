import { describe, expect, test } from 'vitest';
import { emptyHoldings } from '../holdings';
import type { Game, GameState } from '../types';
import { stepPlayers } from './hints';

const state = (over: Partial<GameState> = {}): GameState => ({
  systems: {}, ground: {}, exhausted: [], control: {}, tokensOnMap: [], tradeGoods: 0, commodities: 0, tactic: 0, fleet: 0, strategy: 0,
  vp: 0, opponentVp: {}, holdings: emptyHoldings(), docks: [], pds: {}, ...over,
});
const game: Pick<Game, 'opponents' | 'planetOwner'> = {
  opponents: [{ id: 'a', faction: '', vp: 0, seat: 2, color: 2 }, { id: 'b', faction: '', vp: 0, seat: 3, color: 3 }],
  planetOwner: {},
};
const HERE = '0,1';

describe('stepPlayers: whom the reminders of a step are asked of', () => {
  const board = state({
    systems: { '5,5': { carrier: 1 } },
    control: { p1: 'enemy' },
    rivalHolds: { p1: 'b' },
    rivals: { a: state({ systems: { [HERE]: { cruiser: 1 } } }), b: state() },
  });

  test('a battle and an invasion concern the owner and everyone who stands in the active system or holds a planet there', () => {
    expect(stepPlayers(game, board, undefined, 'combat', HERE, ['p1'])).toEqual(['me', 'a', 'b']);
    expect(stepPlayers(game, board, undefined, 'invasion', HERE, [])).toEqual(['me', 'a']);
    expect(stepPlayers(game, board, 'b', 'combat', HERE, [])).toEqual(['b', 'a']);
  });

  test('I am among them in an action of an opponent when my units or my planet are there', () => {
    const mine = { ...board, systems: { [HERE]: { fighter: 2 } } };
    expect(stepPlayers(game, mine, 'a', 'combat', HERE, [])).toEqual(['a', 'me']);
    expect(stepPlayers(game, { ...board, control: { p2: 'me' } }, 'b', 'invasion', HERE, ['p2'])).toEqual(['b', 'me', 'a']);
    expect(stepPlayers(game, { ...board, ground: { p2: { infantry: 1 } } }, 'b', 'invasion', '9,9', ['p2'])).toEqual(['b', 'me']);
  });

  test('every other step concerns the owner alone, and so does a battle with no system yet', () => {
    expect(stepPlayers(game, board, undefined, 'production', HERE, ['p1'])).toEqual(['me']);
    expect(stepPlayers(game, board, 'a', 'movement', HERE, ['p1'])).toEqual(['a']);
    expect(stepPlayers(game, board, undefined, 'combat', null, [])).toEqual(['me']);
  });
});
