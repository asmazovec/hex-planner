import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './amalgamation';

describe('ability:amalgamation Amalgamation', () => {
  // "When you produce a unit: You may return 1 captured unit of that type to produce that unit without spending resources."
  // Checks: the ability is a reminder of the production.
  // Why nothing is validated here: the plan keeps no captured units, so it cannot know which units may be produced
  // without spending resources.
  test('ability:amalgamation is a hint of the production', () => {
    const { pack } = bench({ faction: 'cabal', expansions: ['pok'] });
    quote(pack, id, 'return 1 captured unit of that type to produce that unit without spending resources');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['production']);
  });

  // LRR 67.2 (with 68.1): units produced are paid with resources.
  // Checks: a production paid with nothing is short of resources for the Cabal as for anyone.
  // Why the check is NOT redundant here: without a record of the captured units the plan cannot tell a free unit
  // from an unpaid one; the shortfall stands and the reminder explains it.
  test('ability:amalgamation a production paid with nothing stays short of resources', () => {
    const build = tactical(HOME, { production: { cruiser: 1 } });
    const table = bench({ faction: 'cabal', expansions: ['pok'], entries: [build], game: { docks: ['h1'] } });
    expectStanding(warningsOf(table, build), 'shortResources');
  });

  test.todo('ability:amalgamation returns a captured unit to produce one for free: captured units are not modelled');
});
