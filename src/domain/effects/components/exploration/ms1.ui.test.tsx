import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical, using } from '../kit';
import { id } from './ms1';

uiBench();

const table = (move: ReturnType<typeof tactical>) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });

// "You may replenish your commodities, or you may convert your commodities to trade goods."
// Checks: after a tactical action that explores a frontier token, I name Merchant Station in «Used»; it is taken.
// Why this is needed: the card changes counts the plan keeps, so the entry that explores must be able to name it;
// exploration cards are not offered in «Used» yet.
test('exploration:ms1 Merchant Station is named in «Used» of the action that explores', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const ms = table(move);
  quote(ms.pack, id, 'You may replenish your commodities');
  const live = showUses(ms, move);
  await use('Merchant Station');
  expect(live.entry().uses).toEqual([id]);
});

// Checks: the card in «Used» offers its two branches; I press «Replenish commodities» and the entry keeps the choice.
// Why this is needed: the plan must know which of the two counts the card changes.
test.fails('exploration:ms1 the card asks which branch is taken', async () => {
  const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id);
  const live = showUses(table(move), move);
  await userEvent.click(screen.getByRole('button', { name: 'Replenish commodities' }));
  expect(live.entry()).toMatchObject({ choices: { merchantStation: 'replenish' } });
});
