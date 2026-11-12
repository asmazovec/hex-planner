import { describe, expect, test } from 'vitest';
import type { Holdings } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './cabalbt';

/** Four systems of The Fracture in a row beside the map, each the neighbour of the one before. */
const F0 = '0,-4';
const F3 = '3,-4';
const FRACTURE = { active: true, ingress: [], seat: null, tiles: { [F0]: 'r-empty', '1,-4': 'r-empty', '2,-4': 'r-empty', [F3]: 'r-empty' } };

/** A Cabal cruiser (move 2) flies three systems, from `from` to `to`. */
const flight = (from: string, to: string, breakthrough: Holdings['breakthrough'] | null = 'held') => {
  const entry = tactical(to, { moves: [{ from, units: { cruiser: 1 }, via: from === F0 ? ['1,-4', '2,-4'] : [NEAR, TARGET] }] });
  return {
    entry,
    ...bench({ faction: 'cabal', expansions: ['pok', 'te'], units: { [from]: { cruiser: 1 } }, start: breakthrough ? { breakthrough } : {}, entries: [entry], game: { fracture: FRACTURE } }),
  };
};

describe('breakthrough:cabalbt Al\'Raith Ix Ianovar', () => {
  // "Apply +1 to the MOVE value of each of your ships that start their movement in The Fracture."
  // Checks: a cruiser that starts in The Fracture moves three systems; no speed warning.
  // Why the default limit does not apply: the breakthrough changes the move value itself (a `modify` of `speed`), so
  // the check runs against 3 and finds nothing; nothing is waived.
  test('breakthrough:cabalbt a ship that starts in The Fracture moves one system further', () => {
    const table = flight(F0, F3);
    quote(table.pack, id, 'Apply +1 to the MOVE value of each of your ships that start their movement in The Fracture.');
    expectNone(warningsOf(table, table.entry), 'speedShort');
  });

  // Checks: a cruiser that starts on the map is short as always.
  // Why the check is NOT redundant here: the +1 is for ships that start their movement in The Fracture.
  test('breakthrough:cabalbt a ship that starts on the map moves as always', () => {
    const table = flight(HOME, FAR);
    expectStanding(warningsOf(table, table.entry), 'speedShort');
  });

  // LRR 58.2: a ship moves no further than its move value.
  // Checks: without the breakthrough the cruiser in The Fracture is short.
  // Why the check is NOT redundant here: the breakthrough must be held.
  test('breakthrough:cabalbt not held, a ship in The Fracture moves as always', () => {
    const table = flight(F0, F3, null);
    expectStanding(warningsOf(table, table.entry), 'speedShort');
  });

  // LRR 34.4.1 (as for any card): an exhausted card keeps its passive abilities.
  // Checks: the breakthrough's +1 holds while it is exhausted.
  // Why the default limit does not apply: the +1 is not an ability that exhausts the card.
  test('breakthrough:cabalbt exhausted, it still gives the +1', () => {
    const table = flight(F0, F3, 'exhausted');
    expectNone(warningsOf(table, table.entry), 'speedShort');
  });

  test.todo('breakthrough:cabalbt brings The Fracture into play and moves two ingress tokens into gravity rifts: The Fracture is opened on the map by hand');

  test('breakthrough:cabalbt is a passive effect that changes the move value', () => {
    const { pack } = flight(F0, F3);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.speed).toBeDefined();
  });
});
