import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './rally';

uiBench();

const setup = () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 5 } }] });
  const table = bench({
    faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 5 } }, start: { hand: [id] }, entries: [move],
    game: { opponents: [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } },
  });
  return { move, table };
};

// "Place 2 command tokens from your reinforcements in your fleet pool."
// Checks: five cruisers fly into a system with an opponent's ship; the player names Rally in «Used» of the tactical
// editor, and the fleet pool warning of the five ships goes away.
// Why the check is redundant here: the fleet pool now holds 5 tokens, so five ships are within it (a change of the
// number, not a waiver: nothing is shown as allowed).
test('actionCard:rally named in «Used», the five ships no longer exceed the fleet pool', async () => {
  const { move, table } = setup();
  quote(table.pack, id, 'Place 2 command tokens from your reinforcements in your fleet pool.');
  showTactical(table, move);
  expectShownStanding('fleetPool');
  await use('Rally');
  expectNotShown('fleetPool');
});

// LRR 37.1: the fleet pool limits the non-fighter ships in a system.
// Checks: without Rally the warning stands in the editor.
// Why the check is NOT redundant here: the card was not named.
test('actionCard:rally not named, the fleet pool warning of five ships stands', () => {
  const { move, table } = setup();
  showTactical(table, move);
  expectShownStanding('fleetPool');
});
