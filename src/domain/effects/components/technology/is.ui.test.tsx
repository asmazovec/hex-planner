import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { ExtensionCode } from '../../../types';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './is';

uiBench();

/** The check pass 2 adds for everyone (src/domain/rules/codes/researchPrerequisites.ts, LRR 90.12). */
const CODE = 'researchPrerequisites' as ExtensionCode;

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
test.fails('technology:is chosen in «Used» of a research, the prerequisites warning reads as allowed by Inheritance Systems', async () => {
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
test.fails('technology:is not chosen, the prerequisites warning stands', () => {
  const { card, table } = research();
  showUses(table, card);
  expectShownStanding(CODE);
});
