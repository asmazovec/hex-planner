import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './as';

uiBench();

const ANOMALY = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-asteroid' };
const table = (map: Record<string, string>) => {
  const move = tactical(FAR, { moves: [{ from: NEAR, units: {}, via: [TARGET] }] });
  return { move, table: bench({ faction: 'empyrean', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, start: { technologies: [id] }, entries: [move], game: { map } }) };
};

// "After you or one of your neighbors activates a system that is adjacent to an anomaly, you may apply +1 to the move
//  value of all of that player's ships during this tactical action."
// Checks: the active system lies next to an asteroid field; I take the carrier (move 1) on a route of two systems, it
// is written into the move, and no speed warning is shown.
// Why the default limit does not apply: the carrier's move value is 2 during this action (a modify, nothing waived).
test.fails('technology:as a carrier is taken two systems toward an anomaly, and no speed warning is shown', async () => {
  const stream = table(ANOMALY);
  quote(stream.table.pack, id, 'you may apply +1 to the move value of all of that player\'s ships during this tactical action');
  const live = showFlight(stream.table, stream.move, NEAR);
  await take('Carrier');
  expect(live.entry().moves[0].units).toEqual({ carrier: 1 });
  expectNotShown('speedShort');
});

// LRR 58.2: a ship moves no farther than its move value.
// Checks: with no anomaly beside the active system the same flight shows the speed warning.
// Why the check is NOT redundant here: the technology's condition is not met.
test('technology:as no anomaly beside the active system, the speed warning stands', async () => {
  const stream = table({ ...ANOMALY, [FARTHER]: 'r-empty' });
  showFlight(stream.table, stream.move, NEAR);
  await take('Carrier');
  expectShownStanding('speedShort');
});
