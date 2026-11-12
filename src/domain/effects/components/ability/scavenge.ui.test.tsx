import { expect, test } from 'vitest';
import { land, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, endOf, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './scavenge';

uiBench();

const table = (faction: string) => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }] });
  return { move, table: bench({ faction, units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [move] }) };
};

// "After you gain control of a planet: Gain 1 trade good."
// Checks: in the tactical editor I land the infantry on Target One; the plan ends with control of the planet and 1
// trade good.
// Why it is counted here: the plan keeps the trade goods; the ability adds one when control is gained.
test('ability:scavenge landing on a planet in the editor brings 1 trade good for the Saar', async () => {
  const saar = table('saar');
  quote(saar.table.pack, id, 'After you gain control of a planet: Gain 1 trade good.');
  const live = showTactical(saar.table, saar.move);
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 } }]);
  expect(endOf({ pack: saar.table.pack, game: live.game() }).tradeGoods).toBe(1);
});

// Checks: the same landing by another faction brings no trade good.
// Why nothing is gained here: Scavenge is on the Saar faction sheet only.
test('ability:scavenge the same landing by another faction brings none', async () => {
  const sol = table('sol');
  const live = showTactical(sol.table, sol.move);
  await land('Infantry', 'Target One');
  expect(endOf({ pack: sol.table.pack, game: live.game() }).tradeGoods).toBe(0);
});
