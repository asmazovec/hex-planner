import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { StartHoldings } from '../../../types';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './ffac2';

uiBench();

const table = (infantry: number, start: StartHoldings) => {
  const build = tactical(HOME, { production: { infantry } });
  return { build, table: bench({ faction: 'saar', start, entries: [build], game: { docks: ['h2'] } }) };
};

// "PRODUCTION 7."
// Checks: the tactical editor of seven infantry produced at the Saar dock on Home Two (1 resource) shows no
// production warning.
// Why the default value does not apply: the Floating Factory prints a flat 7; the generated upgrade would give 5.
test('technology:ffac2 seven units show no production warning', () => {
  const seven = table(7, { technologies: [id] });
  quote(seven.table.pack, id, 'PRODUCTION 7.');
  showTactical(seven.table, seven.build);
  expectNotShown('productionOver');
});

// Checks: an eighth unit shows the production warning standing.
// Why the check is NOT redundant here: the upgrade changes the value, it does not lift the limit.
test('technology:ffac2 an eighth unit shows the production warning standing', () => {
  const eight = table(8, { technologies: [id] });
  showTactical(eight.table, eight.build);
  expectShownStanding('productionOver');
});

// Checks: not researched, seven units from the same dock show the warning.
// Why the check is NOT redundant here: the upgrade is not researched.
test('technology:ffac2 not researched, seven units show the production warning standing', () => {
  const seven = table(7, {});
  showTactical(seven.table, seven.build);
  expectShownStanding('productionOver');
});
