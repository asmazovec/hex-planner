import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, endOf, quote, statusTokens } from '../kit';
import { id } from './arborec_mech';

uiBench();

/** Two infantry stand on the home planet h1 before the status phase. */
const table = () => {
  const status = statusTokens(2, 0, 0);
  return { status, ...bench({ faction: 'arborec', expansions: ['pok'], entries: [adjust({ ground: { h1: { infantry: 2 } } }, 'strategy'), status] }) };
};

// "DEPLOY: When you would use your Mitosis faction ability you may replace 1 of your infantry with 1 mech from your
//  reinforcements instead."
// Checks: in «Used» of the status entry I choose Letani Behemoth; it is written into the entry, and on the home planet
// one infantry has become a mech.
// Why the default does not apply: a mech is placed by production only (67); the deploy places it at another moment.
test('mech:arborec_mech is chosen in «Used» of the status entry and replaces an infantry', async () => {
  const mech = table();
  quote(mech.pack, id, 'you may replace 1 of your infantry with 1 mech from your reinforcements instead');
  const live = showUses(mech, mech.status);
  await use('Letani Behemoth');
  expect(live.entry().uses).toEqual([id]);
  const end = endOf({ pack: mech.pack, game: live.game() });
  expect(end.ground.h1).toEqual({ infantry: 1, mech: 1 });
});
