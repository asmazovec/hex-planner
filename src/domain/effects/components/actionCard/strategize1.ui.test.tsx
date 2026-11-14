import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, use, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, quote, secondary } from '../kit';
import { id } from './strategize1';

uiBench();

const table = (entry: Entry) => {
  const made = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [entry] });
  made.game.plans[0].rounds[0].strategyCard = CARD.trade;
  return made;
};

// "Perform the secondary ability of any readied or unchosen strategy card."
// Checks: the secondary of my own Trade is warned of; I name Strategize in «Used», it is written into the entry, and
// the warning reads as allowed by Strategize.
// Why the check is redundant here: LRR 83.4 keeps my own card's secondary from me; the card lets me perform it.
test('actionCard:strategize1 named in «Used» of my own secondary, the warning reads as allowed by Strategize', async () => {
  const own = secondary(CARD.trade);
  const mine = table(own);
  quote(mine.pack, id, 'Perform the secondary ability of any readied or unchosen strategy card.');
  const live = showUses(mine, own);
  expectShownStanding('ownSecondary');
  await use('Strategize');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('ownSecondary', 'Strategize');
});

// LRR 83.4: the secondary ability is the other players'.
// Checks: without the card my own secondary stays in the plan and its warning stands.
// Why the check is NOT redundant here: the card is held, not played.
test('actionCard:strategize1 not named, my own secondary stands warned', () => {
  const own = secondary(CARD.trade);
  showUses(table(own), own);
  expectShownStanding('ownSecondary');
});
