import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './winnubt';

uiBench();

const table = (legendary: boolean) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  return {
    move,
    table: bench({
      faction: 'winnu', expansions: ['te'], units: { [HOME]: { carrier: 1 } }, start: { breakthrough: 'held' }, entries: [move],
      edit: pack => { if (legendary) pack.planets.t1 = { ...pack.planets.t1, legendary: 'Test Legend' }; },
    }),
  };
};

// "After you activate a system that contains a legendary planet, apply +1 to the move value of 1 of your ships during
//  this tactical action."
// Checks: the target holds a legendary planet; I take a carrier (move 1) for a route of two systems; it is written
// into the move, and the warning that it falls short reads as allowed by Imperator.
// Why the check is redundant here: that carrier's move value is 2 this action.
test('breakthrough:winnubt a carrier is taken for a route one system too long, and it reads as allowed by Imperator', async () => {
  const winnu = table(true);
  quote(winnu.table.pack, id, 'apply +1 to the move value of 1 of your ships');
  const live = showFlight(winnu.table, winnu.move, HOME);
  await take('Carrier');
  expect(live.entry().moves[0].units).toEqual({ carrier: 1 });
  expectShownWaived('speedShort', 'Imperator');
});

// LRR 58.1: a ship moves no farther than its move value.
// Checks: into a system without a legendary planet the same carrier is taken and the warning stands.
// Why the check is NOT redundant here: the +1 comes only with a legendary planet in the active system.
test('breakthrough:winnubt without a legendary planet the carrier is still taken and its warning stands', async () => {
  const winnu = table(false);
  showFlight(winnu.table, winnu.move, HOME);
  await take('Carrier');
  expectShownStanding('speedShort');
});
