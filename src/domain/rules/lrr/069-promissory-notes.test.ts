/** LRR 69 Promissory Notes. Source: tirules2 rules-reference/promissory-notes.md. */
import { describe, expect, test } from 'vitest';
import type { Act, Entry, Goods, Opponent } from '../../types';
import { FACTION, NEAR, codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const RIVAL: Opponent = { id: 'o1', faction: FACTION, vp: 0, seat: 2, color: 2 };
const A = 'promissory:war_funding';
const B = 'promissory:ragh';
const deal = (give: Goods, get: Goods = {}): Act => ({ kind: 'transaction', with: 'o1', give, get });
/** Me and the rival with a ship in one system: neighbours (60). */
const table = (mine: Entry, me: string[], theirs: string[] = []) => rulesGame({
  units: { [NEAR]: { carrier: 1 } },
  entries: [mine],
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { promissory: me }, opponents: { o1: { promissory: theirs } } } },
});

describe('LRR 69 Promissory Notes', () => {
  test.todo('69.1: a player resolves their promissory notes by the card text — not modelled: promissory notes are not tracked (a manual adjustment stands in)');
  test.todo('69.1.1: promissory notes are optional unless stated — not modelled: promissory notes are not tracked');
  test.todo('69.2: a player cannot play their own colour\'s or faction\'s notes — not modelled: promissory notes are not tracked');
  test.todo('69.3: a returned note comes back after its ability fully resolves — not modelled: promissory notes are not tracked');
  test.todo('69.4: a returned note can be given away again — not modelled: the return of a played note is not tracked (a note held is given by a transaction, 94.2)');
  test.todo('69.4.1: an unrevealed note ignores its own return conditions — not modelled: promissory notes are not tracked');
  test('69.5: one promissory note from each side of a transaction is allowed', () => {
    const mine = tactical(NEAR, { acts: [deal({ components: [A] }, { components: [B] })] });
    expect(codesOf(table(mine, [A], [B]), pack, mine)).toEqual([]);
  });

  test('69.5: a second promissory note from one side of a transaction warns, and both still change hands', () => {
    const mine = tactical(NEAR, { acts: [deal({ components: [A, B] })] });
    const game = table(mine, [A, B]);
    expect(codesOf(game, pack, mine)).toEqual(['transactionNotes']);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([A, B]);
  });

  test('69.5: a note that first belonged to another player counts toward the one note as well', () => {
    const mine = tactical(NEAR, { acts: [deal({}, { components: [A, B] })] });
    expect(codesOf(table(mine, [], [A, B]), pack, mine)).toEqual(['transactionNotes']);
  });

  test.todo('69.5.1: notes in a play area cannot be traded — not modelled: the holdings do not tell a note in hand from one played face up');
  test.todo('69.6: promissory note hands are hidden — not modelled: hidden information is outside the planner');
  test.todo('69.7: an eliminated player\'s notes leave the game — not modelled: elimination is not tracked');
  test.todo('69.7.1: other players\' notes they held go back to their owners — not modelled: elimination is not tracked');
  test.todo('69 note 1: the number of notes in hand is public — not modelled: promissory notes are not tracked');
  test.todo('69 note 2: which note was traded may stay hidden, not that a trade happened — not modelled: hidden information is outside the planner');
  test.todo('69 note 2.2: Alliance and Support for the Throne are played at once, so trading them is public — not modelled: promissory notes are not tracked');
  test.todo('69 note 3: a player may reveal notes in hand — not modelled: hidden information is outside the planner');
});
