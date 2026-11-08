/** LRR 66 Politics. Source: tirules2 rules-reference/politics.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();

describe('LRR 66 Politics', () => {
  test('66.1: the holder of Politics resolves its primary as a strategic action, for no token', () => {
    const play = primary(CARD.politics);
    const game = rulesGame({ entries: [play] });
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test.todo('66.2.1: the speaker goes to a player without the token, possibly the active player — not modelled: no current speaker is kept, and the editor offers only opponents, so I cannot name myself');
  test.todo('66.2.2: the active player draws two action cards — not modelled: action cards are not tracked');
  test.todo('66.2.3: the active player looks at the top two agendas and orders them — not modelled: the agenda deck is not tracked');

  test('66.3: another player\'s secondary of Politics costs a token from the strategy pool', () => {
    const follow = secondary(CARD.politics);
    const game = rulesGame({ entries: [follow] });
    expect(forecast(game, pack).state.strategy).toBe(1);
    expect(codesOf(game, pack, follow)).toEqual([]);
  });

  test('66.3: without a token in the strategy pool, the secondary is warned about', () => {
    const first = secondary(CARD.politics);
    const second = secondary(CARD.trade);
    const third = secondary(CARD.politics);
    expect(codesOf(rulesGame({ entries: [first, second, third] }), pack, third)).toContain('shortStrategy');
  });

  test.todo('66 note 1: a short action card deck is dealt clockwise from the active player, then reshuffled — not modelled: action cards are not tracked');
  test.todo('66 note 2: the agenda cards seen cannot be shown to others — not modelled: the agenda deck is not tracked');
});
