import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './st';

uiBench();

/** The tactical editor of an action in the home system that produces a cruiser (cost 2) and pays with h2 (1 resource). */
const editor = (technologies: string[]) => {
  const move = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', start: { technologies }, entries: [move], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
  return { table, live: showTactical(table, move) };
};

// "When 1 or more of your units use PRODUCTION, reduce the combined cost of the produced units by 1."
// Checks: the editor of a production of a cruiser paid with 1 resource shows no shortfall of resources.
// Why the check is redundant here: the card makes the combined cost 1; the number changes (a modify), so no warning
// is made at all.
test('technology:st a cruiser paid with 1 resource shows no shortfall in the editor', () => {
  const { table } = editor([id]);
  quote(table.pack, id, 'reduce the combined cost of the produced units by 1');
  expectNotShown('shortResources');
});

// LRR 67.1: "To produce a unit, a player must spend a number of resources equal to or greater than the cost value of
//  the unit they are producing."
// Checks: without the card the shortfall stands in the editor.
// Why the check is NOT redundant here: nothing this player holds reduces the cost.
test('technology:st not held, the shortfall of resources stands in the editor', () => {
  editor([]);
  expectShownStanding('shortResources');
});
