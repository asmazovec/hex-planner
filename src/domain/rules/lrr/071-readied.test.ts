/** LRR 71 Readied. Source: tirules2 rules-reference/readied.md. */
import { describe, expect, test } from 'vitest';
import { readyResources } from '../../project';
import { CARD } from '../../strategy';
import { adjust, before, codesOf, forecast, HOME, primary, rulesGame, rulesPack, secondary, statusTokens, tactical } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };
const spendH1 = () => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });

describe('LRR 71 Readied', () => {
  test('71.1: a planet is either ready or exhausted: spending it moves it from one to the other', () => {
    const spend = spendH1();
    const game = rulesGame({ entries: [spend], game: atHome });
    expect(before(game, pack, spend).exhausted).not.toContain('h1');
    expect(forecast(game, pack).state.exhausted).toContain('h1');
  });

  test('71.2: exhausting a ready planet spends its resources', () => {
    const spend = spendH1();
    const game = rulesGame({ entries: [spend], game: atHome });
    expect(codesOf(game, pack, spend)).toEqual([]);
    expect(readyResources(forecast(game, pack).state, pack)).toBe(1);
  });

  test.todo('71.3: some technologies are exhausted to resolve their ability — not modelled: technology cards are not tracked');
  test.todo('71.3.1: such a technology says it is exhausted as a cost — not modelled: technology cards are not tracked');

  test('71.4: an exhausted planet cannot be spent until readied', () => {
    const first = spendH1();
    const second = spendH1();
    expect(codesOf(rulesGame({ entries: [first, second], game: atHome }), pack, second)).toContain('planetExhausted');
  });

  test('71.4: a planet readied by Diplomacy can be spent again', () => {
    const first = spendH1();
    const ready = secondary(CARD.diplomacy, { readied: ['h1'] });
    const second = spendH1();
    expect(codesOf(rulesGame({ entries: [first, ready, second], game: atHome }), pack, second)).not.toContain('planetExhausted');
  });

  test('71.5: the Ready Cards step readies every exhausted planet', () => {
    const spend = spendH1();
    const next = spendH1();
    expect(codesOf(rulesGame({ rounds: [[spend, statusTokens(1, 1, 0)], [next]], game: atHome }), pack, next)).not.toContain('planetExhausted');
  });

  test('71.6: a strategic action exhausts the card: its primary cannot be resolved again this round', () => {
    const first = primary(CARD.trade);
    const again = primary(CARD.trade);
    expect(codesOf(rulesGame({ entries: [first, again] }), pack, again)).toContain('primaryRepeated');
  });

  test('71.6.1: the card is readied in the status phase: its primary is free again next round', () => {
    const again = primary(CARD.trade);
    expect(codesOf(rulesGame({ rounds: [[primary(CARD.trade)], [again]] }), pack, again)).not.toContain('primaryRepeated');
  });

  test.todo('71 note 1: passive abilities of an exhausted card still apply — not modelled: card abilities are not applied');

  test('71 note 2: planets ready again at the end of the agenda phase', () => {
    const spend = spendH1();
    const later = adjust({}, 'agenda');
    const next = spendH1();
    const game = rulesGame({ rounds: [[spend, later], [next]], game: atHome });
    expect(codesOf(game, pack, next)).not.toContain('planetExhausted');
  });

  test('71 note 3: a game effect readies only planets the player controls', () => {
    const ready = secondary(CARD.diplomacy, { readied: ['t1'] });
    expect(codesOf(rulesGame({ entries: [ready] }), pack, ready)).toContain('readyNotControlled');
  });
});
