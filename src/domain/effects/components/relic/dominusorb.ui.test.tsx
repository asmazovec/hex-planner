import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, showUses, take, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './dominusorb';

uiBench();

/** The first action activates the home system, so my token lies there; the second leaves it. */
const table = (move: Entry) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { relics: [id] }, entries: [tactical(HOME), move] });

// "Before you move units during a tactical action, you may purge this card to move and transport units that are in
//  systems that contain 1 of your command tokens."
// Checks: the cruiser leaves the home system that holds my token; I choose the Orb in «Used», and the warning reads as
// allowed by Dominus Orb.
// Why the check is redundant here: LRR 58.3.3 forbids the move; the Orb lets units in such systems move.
test('relic:dominusorb chosen in «Used», the move out of a system with my token reads as allowed by Dominus Orb', async () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const orb = table(move);
  quote(orb.pack, id, 'move and transport units that are in systems that contain 1 of your command tokens');
  const live = showUses(orb, move);
  await use('Dominus Orb');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('sourceActivated', 'Dominus Orb');
});

// LRR 58.3.3: "The ship cannot move if it started its movement in another system that contains one of its faction's
//  command tokens."
// Checks: in the flight step the cruiser is taken out of the system with my token all the same, and the warning stands.
// Why the check is NOT redundant here: the Orb was not used.
test('relic:dominusorb not used, the cruiser is still taken and the warning stands', async () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const live = showFlight(table(move), move, HOME);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('sourceActivated');
});
