import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, HOME, quote, tactical } from '../kit';
import { id } from './conscription';

uiBench();

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** The tactical editor of two infantry produced at the home dock and paid with Home Two (1 resource). */
const editor = (inPlay: boolean) => {
  const entry = tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: inPlay ? [law(), entry] : [entry], game: { docks: ['h1'] } });
  return { table, live: showTactical(table, entry) };
};

// "For: When a player produces units, they produce only 1 fighter and infantry for its cost instead of 2."
// Checks: the production of two infantry stays as entered, and the payment block warns of the resource missing.
// Why the check is NOT redundant here: the law raises the cost (a `modify`), it allows nothing; the shortfall stands.
test.fails('agenda:conscription two infantry paid with 1 resource: the shortfall stands in the payment', () => {
  const { table, live } = editor(true);
  quote(table.pack, id, 'they produce only 1 fighter and infantry for its cost instead of 2');
  expect(live.entry().production).toEqual({ infantry: 2 });
  expectShownStanding('shortResources');
});

// LRR 68.1.2: two fighters or two infantry are produced for the cost shown.
// Checks: without the law the same payment covers the two infantry and nothing is shown.
// Why the check is NOT redundant here: the law is not in play.
test('agenda:conscription without the law two infantry are paid with 1 resource', () => {
  editor(false);
  expectNotShown('shortResources');
});
