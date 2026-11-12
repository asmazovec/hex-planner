import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, tactical } from '../kit';
import { id } from './cabalbt';

uiBench();

const F0 = '0,-4';
const F3 = '3,-4';
const FRACTURE = { active: true, ingress: [], seat: null, tiles: { [F0]: 'r-empty', '1,-4': 'r-empty', '2,-4': 'r-empty', [F3]: 'r-empty' } };

const flight = (held: boolean) => {
  const move = tactical(F3, { moves: [{ from: F0, units: {}, via: ['1,-4', '2,-4'] }] });
  const table = bench({
    faction: 'cabal', expansions: ['pok', 'te'], units: { [F0]: { cruiser: 1 } }, start: held ? { breakthrough: 'held' } : {}, entries: [move], game: { fracture: FRACTURE },
  });
  showFlight(table, move, F0);
  return table;
};

// "Apply +1 to the MOVE value of each of your ships that start their movement in The Fracture."
// Checks: in the flight step a cruiser (move 2) is taken from The Fracture for a system three away; no speed warning.
// Why the default limit does not apply: its move value is 3 there (a `modify` of `speed`).
test('breakthrough:cabalbt a cruiser leaving The Fracture flies three systems without a speed warning', async () => {
  const table = flight(true);
  quote(table.pack, id, 'start their movement in The Fracture');
  await take('Cruiser');
  expectNotShown('speedShort');
});

// Checks: without the breakthrough the same cruiser is short, and the warning stands.
// Why the check is NOT redundant here: the breakthrough is not held.
test('breakthrough:cabalbt not held, the cruiser leaving The Fracture is short', async () => {
  flight(false);
  await take('Cruiser');
  expectShownStanding('speedShort');
});
