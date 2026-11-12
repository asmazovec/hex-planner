import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './crashlanding';

uiBench();

/** The carrier flies into the target and is lost in the battle; its infantry lands on t1. */
const crash = () => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], losses: { carrier: 1 }, landings: [{ planetId: 't1', units: { infantry: 1 } }],
});
const table = (move: ReturnType<typeof crash>) =>
  bench({ faction: 'sol', expansions: ['te'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, start: { hand: [id] }, entries: [move] });

// "Place 1 of your ground forces from the space area of the active system onto a planet in that system"
// Checks: in the tactical editor, the carrier lost and the infantry landed, I choose Crash Landing in «Used»; the card
// is named in the entry, and the warning of ground forces in space without capacity reads as allowed by Crash Landing.
// Why the check is redundant here: with the last ship gone the ground force would be removed (16.3); the card puts it
// on the planet.
test('actionCard:crashlanding chosen in «Used», the landing after the last ship is lost reads as allowed by Crash Landing', async () => {
  const move = crash();
  const card = table(move);
  quote(card.pack, id, 'Place 1 of your ground forces from the space area of the active system onto a planet');
  const live = showTactical(card, move);
  await use('Crash Landing');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('capacitySystem', 'Crash Landing');
});

// LRR 16.3: the ground forces in a space area beyond its capacity are removed.
// Checks: without the card the warning stands in the editor.
// Why the check is NOT redundant here: the card was not played.
test('actionCard:crashlanding not played, the landing after the last ship is lost is warned of', () => {
  const move = crash();
  showTactical(table(move), move);
  expectShownStanding('capacitySystem');
});
