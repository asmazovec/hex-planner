import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './mahactcommander';

uiBench();

const table = () => {
  const second = tactical(NEAR);
  return { second, table: bench({ faction: 'mahact', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [tactical(NEAR), second] }) };
};

// "During your tactical actions: you can activate systems that contain your command tokens."
// Checks: my second action into the same system warns of my token there; I name Il Na Viroset in «Used», it is written
// into the entry, and the warning reads as allowed by Il Na Viroset.
// Why the check is redundant here: LRR 89.1 forbids activating a system with my token, and the commander allows it.
test.fails('leader:mahactcommander named in Used, the activation of a system with my token reads as allowed by Il Na Viroset', async () => {
  const commander = table();
  quote(commander.table.pack, id, 'you can activate systems that contain your command tokens');
  const live = showUses(commander.table, commander.second);
  expectShownStanding('systemHasToken');
  await use('Il Na Viroset');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('systemHasToken', 'Il Na Viroset');
});
