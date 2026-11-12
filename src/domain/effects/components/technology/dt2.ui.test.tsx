import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './dt2';

uiBench();

const cabal = (entry: ReturnType<typeof tactical>, dock: string, technologies: string[], units = {}) =>
  bench({ faction: 'cabal', expansions: ['pok'], units, start: { technologies }, entries: [entry], game: { docks: [dock] } });

// "PRODUCTION 7"
// Checks: seven infantry bought at a Dimensional Tear II on a planet of 1 resource; the production block shows no
// warning.
// Why the default limit does not apply: the dock's Production is 7 itself (a `modify`), not 1 + 4.
test.fails('technology:dt2 seven infantry at a Dimensional Tear II on a poor planet: no production warning', () => {
  const entry = tactical(HOME, { production: { infantry: 7 } });
  const table = cabal(entry, 'h2', [id]);
  quote(table.pack, id, 'PRODUCTION 7');
  showTactical(table, entry);
  expectNotShown('productionOver');
});

// Checks: without the upgrade the same production is over the dock's 3.
// Why the check is NOT redundant here: the dock is of level I.
test('technology:dt2 without it the production warning stands', () => {
  const entry = tactical(HOME, { production: { infantry: 7 } });
  showTactical(cabal(entry, 'h2', []), entry);
  expectShownStanding('productionOver');
});

// "Up to 12 fighters in this system do not count against your ships' capacity."
// Checks: a cruiser comes home to twelve fighters by the dock; the result of the action shows no capacity warning.
// Why the default limit does not apply: the dock keeps 12 fighters instead of 3 (a `modify`).
test.fails('technology:dt2 twelve fighters by the dock: the result of the action shows no capacity warning', () => {
  const entry = tactical(HOME, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
  showTactical(cabal(entry, 'h1', [id], { [HOME]: { fighter: 12 }, [NEAR]: { cruiser: 1 } }), entry);
  expectNotShown('capacitySystem');
});

// Checks: without the upgrade nine of the fighters are over capacity, and the warning stands.
// Why the check is NOT redundant here: a dock of level I keeps 3.
test('technology:dt2 without it the capacity warning stands', () => {
  const entry = tactical(HOME, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
  showTactical(cabal(entry, 'h1', [], { [HOME]: { fighter: 12 }, [NEAR]: { cruiser: 1 } }), entry);
  expectShownStanding('capacitySystem');
});
