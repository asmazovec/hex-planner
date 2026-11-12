import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './naalubt';

uiBench();

/** The secondary of Technology after the strategy pool was emptied, for a Naalu player holding Mindsieve. */
const table = () => {
  const play = secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
  return { play, table: bench({ faction: 'naalu', expansions: ['pok', 'te'], start: { breakthrough: 'held' }, entries: [adjust({ strategy: -2 }), play] }) };
};

// "When you would resolve the secondary ability of another player's strategy card, you may give them a promissory note
//  to resolve it without spending a command token."
// Checks: in «Used» of the secondary I choose Mindsieve; it is written into the entry, and the warning that the
// strategy pool is empty reads as allowed by Mindsieve.
// Why the check is redundant here: the secondary is resolved without a command token, so the empty pool is no breach.
test.fails('breakthrough:naalubt named in «Used» of a secondary, the empty strategy pool reads as allowed by Mindsieve', async () => {
  const { play, table: naalu } = table();
  quote(naalu.pack, id, 'to resolve it without spending a command token');
  const live = showUses(naalu, play);
  expectShownStanding('shortStrategy');
  await use('Mindsieve');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('shortStrategy', 'Mindsieve');
});

// LRR 20.5: "... resolve the secondary ability of that strategy card by spending a command token from their strategy pool."
// Checks: without Mindsieve named, the same secondary shows the warning standing.
// Why the check is NOT redundant here: held but not used, the breakthrough spares no token.
test('breakthrough:naalubt not named, the warning of the empty strategy pool stands', () => {
  const { play, table: naalu } = table();
  showUses(naalu, play);
  expectShownStanding('shortStrategy');
});
