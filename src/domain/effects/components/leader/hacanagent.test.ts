import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, secondary, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './hacanagent';

const table = (faction: string, entries: Entry[]) =>
  bench({ faction, expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });
const fly = () => tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });

describe('leader:hacanagent Carth of Golden Sands', () => {
  // "During the action phase: You may exhaust this card to gain 2 commodities ..."
  // Checks: named in the uses of a tactical action, the agent gives the Hacan 2 commodities and is exhausted.
  // Why the check is redundant here: commodities are otherwise replenished by Trade (21.3); the agent gives two.
  test('leader:hacanagent used gains 2 commodities', () => {
    const hacan = table('hacan', [using(fly(), id)]);
    quote(hacan.pack, id, 'You may exhaust this card to gain 2 commodities');
    const end = endOf(hacan);
    expect(end.commodities).toBe(2);
    expect(end.holdings.leaders[id]).toBe('exhausted');
  });

  // Ruling (Hacan, Carth of Golden Sands 2): "The Hacan player cannot have more than six commodities."
  // Checks: after Trade's secondary fills the Hacan's commodities to 6, the agent adds none.
  // Why the check is NOT redundant here: the commodity value of the faction sheet is the ceiling (21.2).
  test('leader:hacanagent never goes beyond the faction\'s commodity value', () => {
    const hacan = table('hacan', [secondary(CARD.trade), using(fly(), id)]);
    expect(endOf(hacan).commodities).toBe(6);
  });

  // Checks: used a second time in the round, the exhausted agent is warned of.
  // Why the check is NOT redundant here: an exhausted card cannot be used until it is readied (34.2).
  test('leader:hacanagent used twice in a round is warned of the second time', () => {
    const again = using(tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }] }), id);
    const hacan = table('hacan', [using(fly(), id), again]);
    expectStanding(warningsOf(hacan, again), 'componentExhausted');
  });

  test.todo('leader:hacanagent replenishes another player\'s commodities instead: `uses` carries no choice of a player');

  test('leader:hacanagent is a play effect', () => {
    expect(effect(table('hacan', []).pack, id).tier).toBe('play');
  });
});
