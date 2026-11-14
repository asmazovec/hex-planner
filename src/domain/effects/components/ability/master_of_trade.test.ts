import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, secondary, warningsOf } from '../kit';
import { id } from './master_of_trade';

const table = (faction: string, entries: Entry[]) => bench({ faction, entries });

describe('ability:master_of_trade Masters of Trade', () => {
  // "You do not have to spend a command token to resolve the secondary ability of the "Trade" strategy card."
  // Checks: the Hacan follows Trade's secondary and the strategy pool keeps its 2 tokens.
  // Why the check is redundant here: 83.4 asks a strategy token for a secondary ability; for Trade the Hacan pay none.
  test('ability:master_of_trade the secondary of Trade spends no strategy token', () => {
    const hacan = table('hacan', [secondary(CARD.trade)]);
    quote(hacan.pack, id, 'You do not have to spend a command token to resolve the secondary ability of the "Trade" strategy card.');
    expect(endOf(hacan).strategy).toBe(2);
  });

  // Checks: with an empty strategy pool the secondary of Trade makes no warning at all.
  // Why the check is redundant here: no token is owed, so a missing one is no shortfall; the cost changed, nothing is
  // listed as waived (a `modify`).
  test('ability:master_of_trade with an empty strategy pool the secondary of Trade is not warned of', () => {
    const follow = secondary(CARD.trade);
    const hacan = table('hacan', [adjust({ strategy: -2 }), follow]);
    expectNone(warningsOf(hacan, follow), 'shortStrategy');
  });

  // Checks: the secondary of Warfare still costs the Hacan a token; with none it is warned of.
  // Why the check is NOT redundant here: the ability names the Trade card only.
  test('ability:master_of_trade another card\'s secondary still costs a token', () => {
    const follow = secondary(CARD.warfare);
    const hacan = table('hacan', [adjust({ strategy: -2 }), follow]);
    expectStanding(warningsOf(hacan, follow), 'shortStrategy');
  });

  // Checks: another faction pays the token for Trade's secondary.
  // Why the check is NOT redundant here: the ability is printed on the Hacan sheet only.
  test('ability:master_of_trade is the Hacan\'s own: another faction pays for Trade\'s secondary', () => {
    expect(endOf(table('sol', [secondary(CARD.trade)])).strategy).toBe(1);
  });

  test('ability:master_of_trade is a passive effect with no waiver', () => {
    const { pack } = table('hacan', []);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
