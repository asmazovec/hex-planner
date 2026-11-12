import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { adjust, bench, quote, secondary } from '../kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { id } from './is';

uiBench();

/** The check of LRR 90.12 (src/domain/rules/codes/prerequisitesMissing.ts). */
const CODE = prerequisitesMissing.code;

/** The Technology secondary for Fleet Logistics (two propulsion prerequisites) by the L1Z1X, who own none. */
const research = () => {
  const card = secondary(CARD.technology, { researched: ['technology:fl'], payment: { planets: ['h1', 'h2'], tradeGoods: 2 } });
  return { card, table: bench({ faction: 'l1z1x', start: { technologies: [id] }, entries: [adjust({ tradeGoods: 2 }), card] }) };
};

// "You may exhaust this card and spend 2 resources when you research a technology; ignore all of that technology's
//  prerequisites."
// Checks: in «Used» of the research I choose Inheritance Systems; it is written into the entry, and the prerequisites
// warning reads as allowed by it.
// Why the check is redundant here: the card ignores every prerequisite of the technology researched (90.12).
test('technology:is chosen in «Used» of a research, the prerequisites warning reads as allowed by Inheritance Systems', async () => {
  const { card, table } = research();
  quote(table.pack, id, "ignore all of that technology's prerequisites");
  const live = showUses(table, card);
  await use('Inheritance Systems');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived(CODE, 'Inheritance Systems');
});

// LRR 90.12: "that player must own one technology of the matching color for each prerequisite symbol".
// Checks: without choosing the card the warning stands.
// Why the check is NOT redundant here: the card says "may exhaust"; not chosen, not used.
test('technology:is not chosen, the prerequisites warning stands', () => {
  const { card, table } = research();
  showUses(table, card);
  expectShownStanding(CODE);
});
