import { expect, test } from 'vitest';
import { expectShownStanding, showUses, shown, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './mahactagent';

uiBench();

/** Trade's secondary with my strategy pool emptied before it. */
const table = () => {
  const entry = secondary(5);
  return { entry, table: bench({ faction: 'mahact', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [adjust({ strategy: -2 }), entry] }) };
};

// "When you would spend a command token during the secondary ability of a strategic action: You may exhaust this card
//  to remove 1 of the active player's command tokens from the board and use it instead."
// Checks: with my strategy pool empty the secondary warns; I name Jae Mir Kan in «Used», it is written into the entry,
// and no standing warning of the strategy pool is left on the screen.
// Why the check is redundant here: the token spent is the active player's, not mine.
test.fails('leader:mahactagent named in Used on a secondary, no standing warning of the strategy pool is left', async () => {
  const agent = table();
  quote(agent.table.pack, id, 'remove 1 of the active player\'s command tokens from the board and use it instead');
  const live = showUses(agent.table, agent.entry);
  expectShownStanding('shortStrategy');
  await use('Jae Mir Kan');
  expect(live.entry().uses).toEqual([id]);
  expect(shown('shortStrategy').filter(item => !item.className.includes('warning-waived'))).toEqual([]);
});
