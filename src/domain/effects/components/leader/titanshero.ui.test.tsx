import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { bench, componentAction, HOME, quote, tactical } from '../kit';
import { id } from './titanshero';

uiBench();

const build = (): Entry => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['elysium'], tradeGoods: 0 } });

/** Elysium pays twice; between the payments the hero is played or not. */
const show = (played: boolean) => {
  const second = build();
  const table = bench({
    faction: 'titans', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, game: { docks: ['elysium'] },
    entries: [build(), ...(played ? [componentAction(id)] : []), second],
    edit: pack => { pack.tiles['r-home'] = { ...pack.tiles['r-home'], planetIds: ['elysium', 'h2'] }; },
  });
  showWarnings(table, second);
  return table;
};

// "ACTION: Ready Elysium and attach this card to it."
// Checks: after the hero the second payment with Elysium shows no warning that it is exhausted.
// Why the check is redundant here: the hero readies Elysium (LRR 34 forbids spending an exhausted planet).
test('leader:titanshero after the hero, Elysium pays again with no exhausted warning', () => {
  const table = show(true);
  quote(table.pack, id, 'Ready Elysium');
  expectNotShown('planetExhausted');
});

// Checks: without the hero the warning stands.
// Why the check is NOT redundant here: Elysium is still exhausted from the first payment.
test('leader:titanshero not played, the second payment with Elysium is warned of', () => {
  show(false);
  expectShownStanding('planetExhausted');
});
