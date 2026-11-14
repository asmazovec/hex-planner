import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './articles_war';

uiBench();

const resolved = (outcome: 'for' | 'against'): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome } } as Entry);

/** The flight step out of the home system in round 2, where an Argent destroyer, an infantry and a mech stand. */
const flight = (law: Entry | null) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'argent', expansions: ['pok'], units: { [HOME]: { destroyer: 1, infantry: 1, mech: 1 } }, rounds: [law ? [law] : [], [move]] });
  return { table, live: showFlight(table, move, HOME) };
};

// "For: All mechs lose their printed abilities except for SUSTAIN DAMAGE."
// Checks: under the law the player still takes the mech aboard the destroyer beyond its place (the plan forbids
// nothing), and the capacity warning stands, no longer allowed by Aerie Sentinel.
// Why the check is NOT redundant here: the law takes away the mech's ability that lifted the check.
test('agenda:articles_war a mech taken aboard beyond capacity is warned of, no longer allowed by its ability', async () => {
  const { table, live } = flight(resolved('for'));
  quote(table.pack, id, 'All mechs lose their printed abilities except for SUSTAIN DAMAGE.');
  await take('Destroyer');
  await take('Infantry');
  await take('Mech');
  expect(live.entry().moves[0].units).toEqual({ destroyer: 1, infantry: 1, mech: 1 });
  expectShownStanding('capacityGroup');
});

// Checks: without the law the same presses show the warning as allowed by Aerie Sentinel.
test('agenda:articles_war without the law the mech\'s ability still allows it', async () => {
  flight(null);
  await take('Destroyer');
  await take('Infantry');
  await take('Mech');
  expectShownWaived('capacityGroup', 'Aerie Sentinel');
});
