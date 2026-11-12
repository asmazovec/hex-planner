import { describe, expect, test } from 'vitest';
import { isWaived } from '../../../rules/registry';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, expectStanding, NEAR, quote, secondary, tactical, using, warningsOf } from '../kit';
import { id } from './mahactagent';

/** Trade's secondary costs a strategy token (92.5, 83.7). */
const TRADE = 5;
const table = (entries: Entry[]) => bench({ faction: 'mahact', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:mahactagent Jae Mir Kan', () => {
  // "When you would spend a command token during the secondary ability of a strategic action: You may exhaust this card
  //  to remove 1 of the active player's command tokens from the board and use it instead."
  // Checks: my secondary names the agent in «Used»: my strategy pool keeps the token the same secondary spends
  // without it.
  // Why the default cost does not apply: the secondary spends a token of my strategy pool (83.7); the agent spends the
  // active player's token instead, so mine is not spent.
  test('leader:mahactagent used on a secondary spends no token of mine', () => {
    const used = table([using(secondary(TRADE), id)]);
    quote(used.pack, id, 'remove 1 of the active player\'s command tokens from the board and use it instead');
    expect(endOf(used).strategy).toBe(endOf(table([secondary(TRADE)])).strategy + 1);
  });

  // Checks: with an empty strategy pool the secondary with the agent is no breach of the strategy pool.
  // Why the check is redundant here: the token spent is not mine, so my empty pool does not matter.
  test('leader:mahactagent used on a secondary with an empty strategy pool leaves no standing shortStrategy', () => {
    const secondaryWithAgent = using(secondary(TRADE), id);
    const used = table([adjust({ strategy: -2 }), secondaryWithAgent]);
    expect(warningsOf(used, secondaryWithAgent).filter(w => w.code === 'shortStrategy' && !isWaived(w))).toEqual([]);
    expect(endOf(used).strategy).toBe(0);
  });

  // LRR 83.7: a secondary costs a strategy token.
  // Checks: without the agent the empty pool is warned of.
  // Why the check is NOT redundant here: the agent was not used.
  test('leader:mahactagent not used, a secondary with an empty strategy pool is warned of', () => {
    const plain = secondary(TRADE);
    expectStanding(warningsOf(table([adjust({ strategy: -2 }), plain]), plain), 'shortStrategy');
  });

  // "... during the secondary ability of a strategic action ..."
  // Checks: named on a tactical action the agent saves nothing: the tactic token is spent as without it.
  // Why the default cost stands here: the agent replaces only the token of a secondary.
  test('leader:mahactagent used on a tactical action saves no token', () => {
    expect(endOf(table([using(tactical(NEAR), id)])).tactic).toBe(endOf(table([tactical(NEAR)])).tactic);
  });

  // "You may exhaust this card" (LRR 51.4): an exhausted agent cannot be used.
  // Checks: the agent is exhausted by its use; a second secondary naming it is warned of.
  // Why the check is NOT redundant here: the agent was spent on the first secondary.
  test('leader:mahactagent exhausted, a second use is warned of', () => {
    const second = using(secondary(8), id);
    const twice = table([using(secondary(TRADE), id), second]);
    expectStanding(warningsOf(twice, second), 'componentExhausted');
    expect(endOf(twice).holdings.leaders[id]).toBe('exhausted');
  });

  // Checks: of two secondaries naming the agent, only the first saves its token.
  // Why the check is NOT redundant here: an exhausted agent does nothing, so the second secondary costs my token.
  test('leader:mahactagent exhausted saves the token of the first secondary only', () => {
    const twice = table([using(secondary(TRADE), id), using(secondary(8), id)]);
    expect(endOf(twice).strategy).toBe(endOf(table([secondary(TRADE), secondary(8)])).strategy + 1);
  });

  test.todo('leader:mahactagent the active player\'s token is removed from the board: the active player of a secondary is not known to the entry');
});
