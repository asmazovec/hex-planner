import { test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './amass_wealth';

uiBench();

/** `spend` is the field pass 2 adds to the status entry: the cost of the public objective scored, in its parts. */
const table = (resources: Payment, influence: Payment, tradeGoods: number) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id], spend: { resources, influence, tradeGoods } } as unknown as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [adjust({ tradeGoods: 12 }), status], game: { planetControl: { h1: 'me', h2: 'me', t2: 'me' } } }) };
};

// "Spend 3 influence, 3 resources, and 3 trade goods."
// Checks: h1 for the resources, t2 for the influence, three trade goods: the status entry shows no shortage.
// Why nothing is shown: every part is paid.
test('publicObjective:amass_wealth every part paid, the status entry shows no shortage', () => {
  const t = table({ planets: ['h1'], tradeGoods: 0 }, { planets: ['t2'], tradeGoods: 0 }, 3);
  quote(t.pack, id, 'Spend 3 influence, 3 resources, and 3 trade goods.');
  showWarnings(t, t.status);
  expectNotShown('shortResources');
  expectNotShown('shortInfluence');
});

// The objective's ruling 2: "A planet may be exhausted to spend either its resource or influence value, but not both."
// Checks: h1 named in both parts is shown as exhausted, standing.
// Why the check is NOT redundant here: one planet gives one of its values.
test.fails('publicObjective:amass_wealth a planet named twice is shown exhausted, standing', () => {
  const t = table({ planets: ['h1'], tradeGoods: 0 }, { planets: ['h1', 'h2'], tradeGoods: 0 }, 3);
  showWarnings(t, t.status);
  expectShownStanding('planetExhausted');
});

test.todo('publicObjective:amass_wealth the player scores the objective and picks each part of its payment in the status entry: the status entry has no editor for `scored` and `spend` yet');
