import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, takeButton, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './naaz_voltron';

uiBench();

/** The flight step of a move out of the home system, where a lone mech stands; Absolute Synergy is held when `flipped`. */
const flight = (flipped: boolean) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'naaz', expansions: ['pok', 'te'], units: { [HOME]: { mech: 1 } }, start: flipped ? { breakthrough: 'held' } : {}, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "This unit is both a ship and ground force."
// Checks: in the flight step I take the lone mech with no ship to carry it; the button takes it, and the capacity
// warning reads as allowed by Eidolon Maximum.
// Why the check is redundant here: the Eidolon Maximum is a ship and moves by itself; it is not transported.
test.fails('mech:naaz_voltron a lone mech is taken into the flight, and the capacity warning reads as allowed by Eidolon Maximum', async () => {
  const { table, live } = flight(true);
  quote(table.pack, id, 'This unit is both a ship and ground force.');
  expect(takeButton('Mech')).toBeEnabled();
  await take('Mech');
  expect(live.entry().moves[0].units).toEqual({ mech: 1 });
  expectShownWaived('capacityGroup', 'Eidolon Maximum');
});

// Checks: without Absolute Synergy the mech is still taken, and the warning stands.
// Why the check is NOT redundant here: the Eidolon Maximum exists only once the breakthrough is flipped.
test('mech:naaz_voltron without Absolute Synergy the lone mech is taken all the same, and its warning stands', async () => {
  const { live } = flight(false);
  await take('Mech');
  expect(live.entry().moves[0].units).toEqual({ mech: 1 });
  expectShownStanding('capacityGroup');
});
