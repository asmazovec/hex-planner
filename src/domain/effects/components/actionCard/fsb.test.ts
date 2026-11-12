import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, NEAR, planned, quote, tactical, warningsOf } from '../kit';
import { id } from './fsb';

const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** The Hacan activate the system of my cruiser; I play Forward Supply Base and choose them for the trade good. */
const theirs = () => tactical(NEAR, {}, { owner: RIVAL.id });
const supply = () => componentAction(id, { choices: { player: RIVAL.id } });
const table = (entries: Entry[]) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [NEAR]: { cruiser: 1 } }, start: { hand: [id] }, entries, game: { opponents: [RIVAL] } });

describe('actionCard:fsb Forward Supply Base', () => {
  // "After another player activates a system that contains your units: Gain 3 trade goods. Then, choose another
  //  player to gain 1 trade good."
  // Checks: I gain three trade goods and the Hacan one.
  // Why the check is redundant here: nothing is lifted; the card gives trade goods outside a transaction, which the
  // count must know for later payments.
  test.fails('actionCard:fsb gains me three trade goods and the chosen player one', () => {
    const card = table([theirs(), supply()]);
    quote(card.pack, id, 'Gain 3 trade goods. Then, choose another player to gain 1 trade good.');
    const end = endOf(card);
    expect(end.tradeGoods).toBe(3);
    expect(end.rivals?.[RIVAL.id].tradeGoods).toBe(1);
  });

  // The window "After another player activates a system ..." is in another player's turn; LRR 2.6: only an "ACTION"
  // card is played as a component action.
  // Checks: played after I passed, it is no action after passing.
  // Why the check is redundant here: the card is played in its window, not as a turn of mine.
  test('actionCard:fsb is not a turn: played after I passed it makes no warning of an action after passing', () => {
    const play = supply();
    expectNone(warningsOf(table([planned({ type: 'pass' }, 'action'), theirs(), play]), play), 'actionAfterPass');
  });

  // Checks: the card is discarded when played, as the replay already plays an action card.
  test('actionCard:fsb played leaves my hand', () => {
    expect(endOf(table([theirs(), supply()])).holdings.hand).not.toContain(id);
  });

  test.todo('actionCard:fsb the condition "a system that contains your units" needs the activation it answers: an entry does not name the action it reacts to');

  test.fails('actionCard:fsb is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
