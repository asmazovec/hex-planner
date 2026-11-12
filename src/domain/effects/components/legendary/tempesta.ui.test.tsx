import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, FAR, HOME, NEAR, quote, TARGET, tactical, using } from '../kit';
import { id } from './tempesta';

uiBench();

const flight = (units: UnitCounts, to = TARGET) =>
  tactical(to, { moves: [{ from: HOME, units, via: to === TARGET ? [NEAR] : [NEAR, TARGET] }] });
const table = (move: ReturnType<typeof flight>) =>
  bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { carrier: 1 } }, entries: [move], game: { planetControl: { tempesta: 'me' } } });

// "You may exhaust this card after you activate a system to apply +1 to the move value of 1 of your ships during this
//  tactical action."
// Checks: a carrier one system short is flown; in «Used» I take the Ionian Fuel Refinery, it is written into the
// entry, and the speed warning stays on the screen in the allowed look, naming the card.
// Why the check is redundant here: the card raises the move value of this one ship by one (LRR 58.3.6 counts against it).
test('legendary:tempesta the refinery is taken in «Used», and the speed warning reads as allowed by it', async () => {
  const move = flight({ carrier: 1 });
  const refinery = table(move);
  quote(refinery.pack, id, 'apply +1 to the move value of 1 of your ships');
  const live = showUses(refinery, move);
  expectShownStanding('speedShort');
  await use('Ionian Fuel Refinery');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('speedShort', 'Ionian Fuel Refinery');
});

// LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
// Checks: without the card the warning of the same flight stands.
// Why the check is NOT redundant here: the card was not exhausted for this action.
test('legendary:tempesta not used: the speed warning stands', () => {
  const move = flight({ carrier: 1 });
  showWarnings(table(move), move);
  expectShownStanding('speedShort');
});

// "... apply +1 ..."
// Checks: a carrier two systems short stays warned of with the card used.
// Why the check is NOT redundant here: one more system is not two.
test('legendary:tempesta used for a ship two systems short: the speed warning stands', () => {
  const move = using(flight({ carrier: 1 }, FAR), id);
  showWarnings(table(move), move);
  expectShownStanding('speedShort');
});
