import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { DataPack, Entry } from '../../../types';
import { bench, componentAction, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './economic_initiative';

uiBench();

const cultural = (pack: DataPack) => { pack.planets.h1 = { ...pack.planets.h1, traits: ['cultural'] }; };
const table = (between: Entry[]) => {
  const again = tactical(TARGET, { payment: { planets: ['h1'], tradeGoods: 0 } });
  const entries = [tactical(NEAR, { payment: { planets: ['h1'], tradeGoods: 0 } }), ...between, again];
  return { again, ...bench({ faction: 'sol', start: { hand: [id] }, entries, edit: cultural }) };
};

// "Ready each cultural planet you control."
// Checks: after the card's component action, the later payment with the cultural planet shows no warning that the
// planet is exhausted.
// Why the check is redundant here: the card readied the planet, so it is not exhausted when it pays again.
test('actionCard:economic_initiative the later payment with the readied planet shows no exhausted warning', () => {
  const readied = table([componentAction(id)]);
  quote(readied.pack, id, 'Ready each cultural planet you control.');
  showWarnings(readied, readied.again);
  expectNotShown('planetExhausted');
});

// LRR 34.4: an exhausted planet cannot be spent until it is readied.
// Checks: without the card the same payment shows the warning, standing.
// Why the check is NOT redundant here: nothing readied the planet.
test('actionCard:economic_initiative not played, the payment shows the exhausted planet', () => {
  const tired = table([]);
  showWarnings(tired, tired.again);
  expectShownStanding('planetExhausted');
});
