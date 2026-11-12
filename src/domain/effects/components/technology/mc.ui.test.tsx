import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './mc';

uiBench();

/** The Technology secondary (four resources) paid with two trade goods, by the Mentak with or without the card. */
const research = (technologies: string[]) => {
  const card = secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: [], tradeGoods: 2 } });
  return { card, table: bench({ faction: 'mentak', start: { technologies }, entries: [adjust({ tradeGoods: 2 }), card] }) };
};

// "When you spend trade goods, each trade good is worth 2 resources or influence instead of 1."
// Checks: the warnings of the research paid with two trade goods show no shortage of resources.
// Why the check is redundant here: two trade goods are worth four resources with the card.
test.fails('technology:mc two trade goods pay the research, and no shortage is shown', () => {
  const { card, table } = research([id]);
  quote(table.pack, id, 'each trade good is worth 2 resources or influence instead of 1');
  showWarnings(table, card);
  expectNotShown('shortResources');
});

// LRR 19.3: a trade good spent is worth one resource.
// Checks: without the card the shortage stands on the screen.
// Why the check is NOT redundant here: the value of 2 is the technology's.
test('technology:mc without the card the shortage of resources stands', () => {
  const { card, table } = research([]);
  showWarnings(table, card);
  expectShownStanding('shortResources');
});
