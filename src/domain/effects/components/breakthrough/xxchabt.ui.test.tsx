import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './xxchabt';

uiBench();

const table = (faction: string) => {
  const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  return { build, table: bench({ faction, expansions: ['te'], start: { breakthrough: 'held' }, entries: [build], game: { docks: ['h1'] } }) };
};

// "You can spend influence as if it were resources."
// Checks: a cruiser is paid with Home Two, 1 resource and 2 influence; the tactical editor shows the warning that a
// resource falls short as allowed by Archon's Gift.
// Why the check is redundant here: Home Two spent for its influence pays 2.
test.fails('breakthrough:xxchabt a production paid with influence reads as allowed by Archon\'s Gift', () => {
  const xxcha = table('xxcha');
  quote(xxcha.table.pack, id, 'You can spend influence as if it were resources.');
  showTactical(xxcha.table, xxcha.build);
  expectShownWaived('shortResources', 'Archon\'s Gift');
});

// Checks: another faction paying the same way shows the shortfall standing.
// Why the check is NOT redundant here: the breakthrough is the Xxcha's.
test('breakthrough:xxchabt another faction paying with influence stands short', () => {
  const sol = table('sol');
  showTactical(sol.table, sol.build);
  expectShownStanding('shortResources');
});
