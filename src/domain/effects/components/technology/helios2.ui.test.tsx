import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './helios2';

uiBench();

/** The tactical editor of an action in the home system that builds nine infantry at the dock on h1 (resources 3). */
const nine = (technologies: string[]) => {
  const move = tactical(HOME, { production: { infantry: 9 } });
  const table = bench({ faction: 'bastion', expansions: ['pok', 'te'], start: { technologies }, game: { docks: ['h1'] }, entries: [move] });
  showTactical(table, move);
  return table;
};

// "This unit's PRODUCTION value is equal to 4 more than the resource value of this planet. The resource value of this
//  planet is increased by 2."
// Checks: the editor of an action that builds nine units at a Helios on a planet of 3 resources shows no warning that
// the Production value is exceeded.
// Why the default limit does not apply: the dock produces 3 + 2 + 4 = 9, not the 7 of Space Dock II; the number
// changes, so nothing is shown as waived either.
test.fails('technology:helios2 nine units built at a Helios on a planet of 3 show no Production warning', () => {
  const table = nine([id]);
  quote(table.pack, id, 'The resource value of this planet is increased by 2.');
  expectNotShown('productionOver');
});

// LRR 79.1: a Space Dock I produces the planet's resources plus 2.
// Checks: without the upgrade the same production is shown as over the Production value, in the look of every warning.
// Why the check is NOT redundant here: Helios V2 is not researched.
test('technology:helios2 not researched, nine units at the dock show the Production warning standing', () => {
  nine([]);
  expectShownStanding('productionOver');
});
