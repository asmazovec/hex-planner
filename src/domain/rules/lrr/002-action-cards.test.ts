/** LRR 2 Action Cards. Source: tirules2 rules-reference/action-cards.md. The hand is kept by what entries gain and play; there is no deck. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../types';
import { forecast, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 2 Action Cards', () => {
  test.todo('2.1: each player draws one action card in each status phase — not modelled: no hand of action cards');
  test.todo('2.2: Politics draws action cards with its primary and secondary — not modelled: Politics is shown only');
  test.todo('2.3: a drawn card comes from the top of the deck into the hand — not modelled: no deck');
  test.todo('2.4: a hand holds at most seven action cards, the rest is discarded — not modelled: no hand');
  test.todo('2.4.1: effects can change the hand limit — not modelled: no hand');
  test.todo('2.5: action cards stay hidden until played — not modelled: no hand');
  test.todo('2.6: the bold first paragraph gives the timing — not modelled: cards are not resolved');
  test.todo('2.6.1: an "Action" card takes a component action and must be resolvable in full — not modelled: a component action is a note');
  test.todo('2.6.2: cards of the same name cannot be played in one window on the same thing; cancelled ones do not count — not modelled: cards are not');
  test('2.7: a played card leaves the hand; its effect is the player\'s to enter', () => {
    const draw: Entry = { id: 'd', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: {}, gains: ['actionCard:bribery', 'actionCard:assassin'] };
    const play: Entry = { id: 'p', phase: 'action', status: 'planned', type: 'component', note: '', componentId: 'actionCard:bribery' };
    expect(forecast(rulesGame({ entries: [draw, play] }), pack).state.holdings.hand).toEqual(['actionCard:assassin']);
  });
  test.todo('2.8: a cancelled card has no effect and is discarded — not modelled: cards are not');
  test.todo('2 note 1: players start with no action cards — not modelled: no hand');
  test.todo('2 note 2: the number of cards in hand is public — not modelled: no hand');
  test.todo('2 note 3: a player may reveal cards in hand — not modelled: no hand');
  test.todo('2 note 4: an empty deck reshuffles the discard pile — not modelled: no deck');
  test.todo('2 note 5: in the action phase cards are dealt in initiative order, Neural Motivator and Yssaril drawing all theirs at once — not modelled: no deck');
  test.todo('2 note 6: a second copy may be played after the first is cancelled — not modelled: cards are not');
  test.todo('2 note 7: offensive cards cannot target oneself — not modelled: cards are not');
  test.todo('2 note 8: "any number", "up to" and "each" cards may target nothing — not modelled: cards are not');
  test.todo('2 note 9: a card naming a number of objects needs them to exist — not modelled: cards are not');
  test.todo('2 note 10: excess cards are discarded at once, not played or traded — not modelled: no hand');
  test.todo('2 note 11: points to the notes on single cards — nothing to test');
});
