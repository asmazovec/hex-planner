import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, showTactical, take, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { bench, componentAction, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './letnevhero';

uiBench();

const table = (before: Entry[], move: Entry) =>
  bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 6 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [...before, move] });
const takeSix = async () => { for (let n = 0; n < 6; n += 1) await take('Cruiser'); };

// "the number of non-fighter ships you can have in systems is not limited by laws or by the number of command tokens
//  in your fleet pool during this game round."
// Checks: after the hero's component action I take six cruisers into one system, one beyond the Letnev limit of
// five; every press takes a ship, and the fleet pool warning of the flight reads as allowed by the hero.
// Why the check is redundant here: this round the fleet pool does not limit the ships, by the card's own words.
test('leader:letnevhero ships are added beyond the fleet pool, and the warning reads as allowed by Darktalon Treilla', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const letnev = table([componentAction(id)], move);
  quote(letnev.pack, id, 'is not limited by laws or by the number of command tokens in your fleet pool');
  const live = showFlight(letnev, move, HOME);
  await takeSix();
  expect(live.entry().moves[0].units).toEqual({ cruiser: 6 });
  expectShownWaived('fleetPool', 'Darktalon Treilla');
});

// LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter ships
//  that a player can have in a system."
// Checks: without the hero's action the same six cruisers leave the warning standing.
// Why the check is NOT redundant here: the hero is an ACTION and was not played.
test('leader:letnevhero not played, the sixth ship is still taken and its warning stands', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const live = showFlight(table([], move), move, HOME);
  await takeSix();
  expect(live.entry().moves[0].units).toEqual({ cruiser: 6 });
  expectShownStanding('fleetPool');
});

// LRR 37.3: a player over the fleet pool removes the excess ships.
// Checks: with the check lifted the result of the action does not ask to remove ships beyond the fleet pool.
// Why the check is redundant here: there is no excess while the fleet pool does not limit the ships.
test('leader:letnevhero the result of the action asks for no ships to be removed while the check is lifted', () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 6 } }] });
  showTactical(table([componentAction(id)], move), move);
  expectShownWaived('fleetPool', 'Darktalon Treilla');
  expect(screen.queryByText('Excess ships')).toBeNull();
});

// Checks: the same action without the hero does ask for them, so the test above is not empty.
// Why the check is NOT redundant here: the fleet pool limits the ships as written.
test('leader:letnevhero not played, the result of the action asks to remove the excess ships', () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 6 } }] });
  showTactical(table([], move), move);
  expectShownStanding('fleetPool');
  expect(screen.getByText('Excess ships')).toBeVisible();
});
