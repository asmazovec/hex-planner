import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { bench, quote, secondary } from '../kit';
import { id } from './brilliant';

uiBench();

const twoResearched = () => secondary(CARD.technology, { researched: ['technology:gd', 'technology:nm'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
const table = (faction: string, entry: ReturnType<typeof secondary>) =>
  bench({ faction, entries: [entry], edit: pack => { pack.planets.h1 = { ...pack.planets.h1, resources: 5 }; } });

// "When you spend a command token to resolve the secondary ability of the "Technology" strategy card: You may resolve
//  the primary ability instead."
// Checks: the warnings of a Jol-Nar secondary of Technology with two technologies and 6 resources paid show neither
// the research limit nor resources.
// Why the default limit does not apply: the secondary resolves as the primary (a `modify`, nothing shown as allowed).
test('ability:brilliant two technologies by the secondary show no warning of limit or resources', () => {
  const entry = twoResearched();
  showWarnings(table('jolnar', entry), entry);
  expectNotShown('researchOverLimit');
  expectNotShown('shortResources');
});

// LRR 91 (Technology, secondary): one technology for 4 resources.
// Checks: another faction's same secondary shows the research limit standing.
// Why the check is NOT redundant here: Brilliant is the Jol-Nar's own.
test('ability:brilliant another faction\'s secondary with two technologies shows the limit standing', () => {
  const entry = twoResearched();
  const sol = table('sol', entry);
  quote(sol.pack, id, 'You may resolve the primary ability instead.');
  showWarnings(sol, entry);
  expectShownStanding('researchOverLimit');
});
