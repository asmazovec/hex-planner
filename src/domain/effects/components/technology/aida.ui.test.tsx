import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, expectShownWaived, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, HOME, primary, quote, tactical } from '../kit';
import { id } from './aida';

uiBench();

/** The prerequisite check pass 2 adds for everyone (LRR 90.9). */
const CODE = 'prerequisitesMissing' as AnyWarningCode;

/** The primary of Technology researches Destroyer II (two red); I hold AIDA, which is one red. */
const research = () => {
  const entry = primary(7, { researched: ['technology:dd2'] });
  return { entry, ...bench({ faction: 'hacan', expansions: ['pok'], start: { technologies: [id] }, entries: [entry] }) };
};

// "When you research a unit upgrade technology, you may exhaust this card to ignore any 1 prerequisite."
// Checks: in «Used» of the research I choose AI Development Algorithm; it is named in the entry and the missing
// prerequisite reads as allowed by it.
// Why the check is redundant here: the card lets one prerequisite symbol of a unit upgrade go unmet.
test.fails('technology:aida chosen in «Used» of a research, the missing prerequisite reads as allowed by it', async () => {
  const table = research();
  quote(table.pack, id, 'you may exhaust this card to ignore any 1 prerequisite');
  const live = showUses(table, table.entry);
  await use('AI Development Algorithm');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived(CODE, 'AI Development Algorithm');
});

// LRR 90.9: "that player must own one technology of the matching color for each prerequisite symbol".
// Checks: without the card chosen, the warning stands.
// Why the check is NOT redundant here: the card was not exhausted for this research.
test.fails('technology:aida not chosen, the missing prerequisite stands', () => {
  const table = research();
  showWarnings(table, table.entry);
  expectShownStanding(CODE);
});

// "When 1 or more of your units use PRODUCTION, you may exhaust this card to reduce the combined cost of the produced
//  units by the number of unit upgrade technologies that you own."
// Checks: two cruisers (4) paid with h1 (3) are short; I choose the card in «Used», own one unit upgrade, and the
// shortfall is gone.
// Why the shortfall is not made: the card lowers the cost of this production by one.
test.fails('technology:aida chosen in «Used» of a production, the cost falls and the shortfall goes', async () => {
  const entry = tactical(HOME, { production: { cruiser: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
  const table = bench({ faction: 'hacan', expansions: ['pok'], start: { technologies: [id, 'technology:dd2'] }, entries: [entry], game: { docks: ['h1'] } });
  const live = showUses(table, entry);
  expectShownStanding('shortResources');
  await use('AI Development Algorithm');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('shortResources');
});
