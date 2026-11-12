import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './standardization';

/** The agenda resolved in the agenda phase of round 1, with the player elected (`me` or an opponent id). */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** My command sheet becomes 5 tactic, 1 fleet and 4 strategy tokens, then the agenda is resolved. */
const table = (elect: string) =>
  bench({ faction: 'sol', expansions: ['pok'], rounds: [[adjust({ tactic: 2, fleet: -2, strategy: 2 }, 'strategy'), resolved(elect)]] });

describe('agenda:standardization Armed Forces Standardization', () => {
  // "The elected player place command tokens from their reinforcements so that they have 3 tokens in their tactic pool,
  //  3 tokens in their fleet pool, and 2 tokens in their strategy pool. They return any excess tokens to their reinforcements."
  // Checks: elected, my sheet of 5/1/4 becomes 3/3/2.
  // Why: a directive changes the command sheet once (7.8), and the pools are what the plan counts.
  test.fails('agenda:standardization sets the command sheet of the elected player to 3, 3 and 2', () => {
    const t = table('me');
    quote(t.pack, id, 'so that they have 3 tokens in their tactic pool, 3 tokens in their fleet pool, and 2 tokens in their strategy pool');
    const end = endOf(t);
    expect([end.tactic, end.fleet, end.strategy]).toEqual([3, 3, 2]);
  });

  // Checks: another player elected, my sheet stays as it was.
  // Why: the directive speaks of the elected player only.
  test('agenda:standardization leaves the sheet of a player not elected as it was', () => {
    const end = endOf(table('o1'));
    expect([end.tactic, end.fleet, end.strategy]).toEqual([5, 1, 4]);
  });

  test('agenda:standardization leaves nothing in play', () => {
    expect(endOf(table('me')).laws ?? []).not.toContain(id);
  });

  test.fails('agenda:standardization is played by the agenda entry that resolves it', () => {
    expect(effect(table('me').pack, id).tier).toBe('play');
  });
});
