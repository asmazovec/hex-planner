import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './ht2';

uiBench();

const show = (technologies: string[]) => {
  const entry = tactical(HOME, { production: { infantry: 1 } });
  const table = bench({ faction: 'titans', expansions: ['pok'], start: { technologies }, entries: [entry], game: { pds: { h1: 1 } } });
  showTactical(table, entry);
  return table;
};

// "PLANETARY SHIELD, SPACE CANNON 5, SUSTAIN DAMAGE, PRODUCTION 1"
// Checks: an infantry bought in the home system, where a Hel-Titan II stands and no space dock; the production block
// shows no warning that nothing produces there.
// Why the check is redundant here: the upgraded PDS has PRODUCTION 1 itself (67.1 asks for a unit with Production).
test.fails('technology:ht2 an infantry bought where only a Hel-Titan stands: no warning that nothing produces', () => {
  const table = show([id]);
  quote(table.pack, id, 'PRODUCTION 1');
  expectNotShown('noProduction');
  expectNotShown('productionOver');
});

// Checks: without the upgrade the warning stands.
// Why the check is NOT redundant here: a PDS of level I has no Production.
test('technology:ht2 without it the production block warns that nothing produces', () => {
  show([]);
  expectShownStanding('noProduction');
});
