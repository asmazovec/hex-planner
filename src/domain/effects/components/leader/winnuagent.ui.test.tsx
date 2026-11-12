import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './winnuagent';

uiBench();

const table = () => {
  const build = tactical(HOME, { production: { cruiser: 1 } });
  return { build, table: bench({ faction: 'winnu', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [build], game: { docks: ['h1'] } }) };
};

// "When 1 or more of a player's units use PRODUCTION: You may exhaust this card to reduce the combined cost of the
//  produced units by 2."
// Checks: a cruiser is produced with nothing paid; I choose Berekar Berekon in «Used»; the warning that the resources
// fall short reads as allowed by the agent.
// Why the check is redundant here: the cost of 2 is reduced by 2.
test.fails('leader:winnuagent chosen in «Used», the production\'s shortfall reads as allowed by Berekar Berekon', async () => {
  const winnu = table();
  quote(winnu.table.pack, id, 'reduce the combined cost of the produced units by 2');
  showTactical(winnu.table, winnu.build);
  await use('Berekar Berekon');
  expectShownWaived('shortResources', 'Berekar Berekon');
});

// Checks: the same production without the agent shows the shortfall standing.
// Why the check is NOT redundant here: the agent is not used.
test('leader:winnuagent not chosen, the shortfall stands', () => {
  const winnu = table();
  showTactical(winnu.table, winnu.build);
  expectShownStanding('shortResources');
});
