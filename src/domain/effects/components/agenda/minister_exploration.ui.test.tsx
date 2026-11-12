import { expect, test } from 'vitest';
import { expectNotShown, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './minister_exploration';

uiBench();

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

// "When the owner of this card gains control of a planet, they gain 1 trade good."
// Checks: in the landing of the tactical editor I land an infantry on Target One; it is written into the entry, no
// warning is made, and the plan ends with the planet mine and 1 trade good.
// Why the check is redundant here: no check is lifted; the law is a `modify` of the trade goods gained with control
// (49.6), so nothing is listed as waived.
test('agenda:minister_exploration the infantry lands on Target One and brings a trade good, with nothing warned of', async () => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }] });
  const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [law(), move] });
  quote(table.pack, id, 'When the owner of this card gains control of a planet, they gain 1 trade good.');
  const live = showTactical(table, move);
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 } }]);
  expectNotShown('unitsMissing');
  expect(endOf({ ...table, game: live.game() }).tradeGoods).toBe(1);
});
