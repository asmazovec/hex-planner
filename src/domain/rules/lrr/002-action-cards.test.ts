/** LRR 2 Action Cards. Source: tirules2 rules-reference/action-cards.md. The hand is kept by what entries gain and play; there is no deck. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../testing/old/domain/types';
import { effectOf } from '../../effects/registry';
import { forecast, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 2 Action Cards', () => {
  test('2.1: the card drawn in the status phase joins the hand; which one it is, the player says', () => {
    const status: Entry = { id: 's', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, gains: ['actionCard:bribery'] };
    expect(forecast(rulesGame({ entries: [status] }), pack).state.holdings.hand).toEqual(['actionCard:bribery']);
  });
  test.todo('2.2: Politics draws action cards with its primary and secondary — not modelled: Politics is shown only');
  test.todo('2.3: a drawn card comes from the top of the deck into the hand — not modelled: no deck');
  test('2.4: a hand holds at most seven action cards: an entry that takes it over the limit is warned of', () => {
    const hand = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];
    const draw: Entry = { id: 'd', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: {}, gains: ['actionCard:disable'] };
    const over = forecast(rulesGame({ entries: [draw], game: { start: { me: { hand }, opponents: {} } } }), pack).warnings.d ?? [];
    expect(over.map(w => w.code)).toEqual(['handOverLimit']);
    expect(over[0].params).toEqual({ cards: 8, limit: 7 });
    expect(over[0]).toMatchObject({ rule: '2.4', step: 'round' });
    const within = forecast(rulesGame({ entries: [draw], game: { start: { me: { hand: hand.slice(1) }, opponents: {} } } }), pack).warnings.d ?? [];
    expect(within).toEqual([]);
  });
  test('2.4.1: effects can change the hand limit: the check asks the `handLimit` point of the count', () => {
    const hand = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];
    const draw: Entry = { id: 'd', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: {}, gains: ['actionCard:disable'] };
    const game = rulesGame({ entries: [draw], game: { start: { me: { hand, technologies: ['technology:ps'] }, opponents: {} } } });
    const effect = effectOf(pack, 'technology:ps')!;
    Object.assign(effect, { tier: 'passive', modify: { handLimit: (value: number) => value + 1 } });
    try {
      expect(forecast(game, pack).warnings.d ?? []).toEqual([]);
    } finally {
      delete effect.modify;
      effect.tier = 'hint';
    }
  });
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
