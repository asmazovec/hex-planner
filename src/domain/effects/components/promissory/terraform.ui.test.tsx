import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, Game } from '../../../../testing/old/domain/types';
import { bench, componentAction, HOME, quote, tactical } from '../kit';
import { id } from './terraform';

uiBench();

const NOTE = `${id}@o1`;
const TITANS: Game['opponents'][number] = { id: 'o1', faction: 'titans', vp: 0, seat: 2, color: 2 };

/** A production of 3 resources paid with t1 alone, after Terraform was played on t1 or not. */
const show = (played: boolean) => {
  const pay = tactical(HOME, { production: { cruiser: 1, destroyer: 1 }, payment: { planets: ['t1'], tradeGoods: 0 } });
  const entries = played ? [componentAction(NOTE, { choices: { planetId: 't1' } } as Partial<Entry>), pay] : [pay];
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { promissory: [NOTE] }, entries, game: { opponents: [TITANS], planetControl: { t1: 'me' }, docks: ['h1'] } });
  showWarnings(table, pay);
  return table;
};

// "Its resource and influence values are each increased by 1"
// Checks: after Terraform on t1 the payment of 3 with t1 alone shows no shortfall.
// Why the check is redundant here: t1 is worth 3 resources with the card attached.
test('promissory:terraform attached to t1, a payment of 3 with t1 shows no shortfall', () => {
  const table = show(true);
  quote(table.pack, id, 'Its resource and influence values are each increased by 1');
  expectNotShown('shortResources');
});

// Checks: without Terraform the shortfall stands.
// Why the check is NOT redundant here: t1 pays its printed 2.
test('promissory:terraform not played, the payment with t1 is short', () => {
  show(false);
  expectShownStanding('shortResources');
});

test.todo('promissory:terraform the component action offers the planets to attach it to: the component action has no choices in the interface yet');
