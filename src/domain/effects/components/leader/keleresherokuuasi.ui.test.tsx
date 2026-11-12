import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './keleresherokuuasi';

uiBench();

const attack = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 3 }, via: [NEAR] }] });
const table = (move: ReturnType<typeof attack>) => bench({
  faction: 'keleresa', expansions: ['pok'], units: { [HOME]: { cruiser: 3 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move],
  game: { planetControl: { t1: 'me' } },
});

// "Place your flagship and up to a total of 2 cruisers and/or destroyers from your reinforcements in the active system."
// Checks: three cruisers arrive within the fleet pool; the player names the hero in «Used» and the flagship it places
// makes a fourth ship, so the result of the action warns of the fleet pool.
// Why the check is NOT redundant here: the hero places ships, it does not lift the fleet pool.
test.fails('leader:keleresherokuuasi named in Used, the flagship placed is counted against the fleet pool', async () => {
  const move = attack();
  const keleres = table(move);
  quote(keleres.pack, id, 'Place your flagship');
  showTactical(keleres, move);
  expectNotShown('fleetPool');
  await use('Kuuasi Aun Jalatai');
  expectShownStanding('fleetPool');
});

// Checks: without the hero the three cruisers make no warning.
test('leader:keleresherokuuasi not named, three cruisers make no fleet pool warning', () => {
  const move = attack();
  showTactical(table(move), move);
  expectNotShown('fleetPool');
});
