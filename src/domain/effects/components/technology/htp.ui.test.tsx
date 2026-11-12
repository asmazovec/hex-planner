import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './htp';

uiBench();

const table = () => {
  const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  return { build, table: bench({ faction: 'winnu', start: { technologies: [id] }, entries: [build], game: { docks: ['h1'] } }) };
};

// "Exhaust this card when 1 or more of your units use PRODUCTION; swap the resource and influence values of 1 planet
//  you control during that use of Production."
// Checks: a cruiser is paid with Home Two (1 resource, 2 influence); I choose Hegemonic Trade Policy in «Used»; the
// warning that a resource falls short reads as allowed by the technology.
// Why the check is redundant here: Home Two swapped pays 2 resources.
test.fails('technology:htp chosen in «Used», the shortfall a swapped planet covers reads as allowed by Hegemonic Trade Policy', async () => {
  const winnu = table();
  quote(winnu.table.pack, id, 'swap the resource and influence values of 1 planet you control');
  showTactical(winnu.table, winnu.build);
  await use('Hegemonic Trade Policy');
  expectShownWaived('shortResources', 'Hegemonic Trade Policy');
});

// Checks: without the technology the shortfall stands.
// Why the check is NOT redundant here: the technology is not used.
test('technology:htp not chosen, the shortfall stands', () => {
  const winnu = table();
  showTactical(winnu.table, winnu.build);
  expectShownStanding('shortResources');
});
