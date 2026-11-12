import { describe, expect, test } from 'vitest';
import type { Entry, LeaderState, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, quote, tactical, using, warningsOf } from '../kit';
import { id } from './winnuagent';

/** The home dock on h1 (3 resources) produces, paid with nothing. */
const produce = (production: UnitCounts) => tactical(HOME, { production });
const table = (entries: Entry[], agent: LeaderState = 'unlocked') =>
  bench({ faction: 'winnu', expansions: ['pok'], start: { leaders: { [id]: agent } }, entries, game: { docks: ['h1'] } });

describe('leader:winnuagent Berekar Berekon', () => {
  // "When 1 or more of a player's units use PRODUCTION: You may exhaust this card to reduce the combined cost of the
  //  produced units by 2."
  // Checks: a cruiser (cost 2) is produced with nothing paid and the agent named in «Used»; the warning that the
  // resources fall short is listed and lifted by the agent.
  // Why the check is redundant here: the cost the payment must meet (67.3) is 2 less with the agent, so a shortfall of
  // 2 is no shortfall.
  test('leader:winnuagent used with a production, a shortfall of 2 resources is waived', () => {
    const build = using(produce({ cruiser: 1 }), id);
    const winnu = table([build]);
    quote(winnu.pack, id, 'reduce the combined cost of the produced units by 2');
    expectWaived(warningsOf(winnu, build), 'shortResources', id);
  });

  // Checks: the same production with the agent left unused is warned of.
  // Why the check is NOT redundant here: the agent is exhausted to be used; held, it changes nothing.
  test('leader:winnuagent not used, the shortfall stands', () => {
    const build = produce({ cruiser: 1 });
    expectStanding(warningsOf(table([build]), build), 'shortResources');
  });

  // "... by 2."
  // Checks: two cruisers (cost 4) paid with nothing fall short by 4, beyond what the agent takes off.
  // Why the check is NOT redundant here: the reduction is 2, the rest of the cost is still owed.
  test('leader:winnuagent a shortfall beyond 2 still stands', () => {
    const build = using(produce({ cruiser: 2 }), id);
    expectStanding(warningsOf(table([build]), build), 'shortResources');
  });

  // LRR 34.1 with "exhaust this card": an exhausted agent cannot be used.
  // Checks: the agent already exhausted is warned of, and frees nothing.
  // Why the check is NOT redundant here: the agent was not there to be exhausted.
  test('leader:winnuagent already exhausted, it is warned of and the shortfall stands', () => {
    const build = using(produce({ cruiser: 1 }), id);
    const warnings = warningsOf(table([build], 'exhausted'), build);
    expectStanding(warnings, 'componentExhausted');
    expectStanding(warnings, 'shortResources');
  });

  // Ruling (Winnu, Berekar Berekon 1): "Production limits still apply."
  // Checks: eleven infantry are beyond the dock's Production value of 5, with the agent too.
  // Why the check is NOT redundant here: the agent lowers the cost, not the number of units produced.
  test('leader:winnuagent does not lift the Production limit', () => {
    const build = using(produce({ infantry: 11 }), id);
    expectStanding(warningsOf(table([build]), build), 'productionOver');
  });

  test('leader:winnuagent is a play effect that waives a shortfall of resources', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['shortResources']);
  });
});
