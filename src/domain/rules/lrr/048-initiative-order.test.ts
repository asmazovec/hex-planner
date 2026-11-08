/** LRR 48 Initiative Order. Source: tirules2 rules-reference/initiative-order.md. */
import { describe, expect, test } from 'vitest';
import { strategyCards } from '../../cards';
import { CARD } from '../../strategy';

describe('LRR 48 Initiative Order', () => {
  test('48.1: every strategy card carries its own initiative number, one to eight', () => {
    for (const set of [[], ['pok'], ['pok', 'te'], ['te']] as const) {
      expect(strategyCards([...set]).map(c => c.initiative)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  test.todo('48.1.1: the Naalu 0 token gives initiative 0 — not modelled: no Naalu token');
  test.todo('48.2: players act from the lowest card up — not modelled: the plan does not order players\' turns');
  test.todo('48.2.1: cards nobody chose do not count for the order — not modelled: the plan does not order players\' turns');
  test.todo('48.3: with three or four players only the lower of a player\'s two cards sets their place — not modelled: the plan does not order players\' turns');
  test.todo('48 note 1: abilities wanted at once resolve in initiative order — not modelled: no timing of abilities');

  test('48 note 2: the cards in initiative order are Leadership, Diplomacy, Politics, Construction, Trade, Warfare, Technology, Imperial', () => {
    const names = ['Leadership', 'Diplomacy', 'Politics', 'Construction', 'Trade', 'Warfare', 'Technology', 'Imperial'];
    expect(strategyCards([]).map(c => c.name)).toEqual(names);
    expect(Object.keys(CARD)).toEqual(names.map(n => n.toLowerCase()));
    expect(Object.values(CARD)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
