import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, endOf, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './harness';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const setup = (hand: string[]) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
  return { move, table: bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { hand }, entries: [move], game: { map: MAP } }) };
};

// "Replenish your commodities."
// Checks: in «Used» of the action that activates the nebula the player takes Harness Energy; the entry names it and
// the plan then ends with the commodities at the Sol value of 4.
// Why it is counted: the replenish is what the card does, and commodities are counted by the plan.
test.fails('actionCard:harness named in «Used», the commodities are replenished', async () => {
  const { move, table } = setup([id]);
  quote(table.pack, id, 'Replenish your commodities.');
  const live = showUses(table, move);
  await use('Harness Energy');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
  expect(endOf({ pack: table.pack, game: live.game() }).commodities).toBe(4);
});

// The replay's own rule for any component (`componentNotHeld`): a card is played from the hand.
// Checks: named without being held, the card is warned of as not held.
// Why the check is NOT redundant here: the card is not in the hand; nothing of the card lifts that.
test('actionCard:harness named without being held is warned of as not held', async () => {
  const { move, table } = setup([]);
  showUses(table, move);
  await use('Harness Energy');
  expectShownStanding('componentNotHeld');
});
