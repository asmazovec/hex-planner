import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, use, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './nav_suite';

uiBench();

const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 2 }, via: [NEAR] }] });
const table = (move: Entry) => bench({
  faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 2 } }, start: { hand: [id] }, entries: [move],
  game: { map: { [HOME]: 'r-home', [NEAR]: 'r-asteroid', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
});

// "During the 'Movement' step of this tactical action, ignore the effect of anomalies."
// Checks: in the tactical editor whose route crosses an asteroid field I name the card in «Used»; it is written into
// the entry, and the route warning reads as allowed by Nav Suite.
// Why the check is redundant here: the asteroid field closes the route by its anomaly effect (LRR 11.1), which the card
// ignores for this movement.
test('actionCard:nav_suite named in «Used» of the action, the route through the asteroid field reads as allowed by Nav Suite', async () => {
  const move = through();
  const navy = table(move);
  quote(navy.pack, id, 'ignore the effect of anomalies');
  const live = showTactical(navy, move);
  expectShownStanding('routeBlocked');
  await use('Nav Suite');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('routeBlocked', 'Nav Suite');
});

// LRR 11.1: "A ship cannot move through or into an asteroid field."
// Checks: without the card the route is still entered, and its warning stands.
// Why the check is NOT redundant here: the card is held, not played with this action.
test('actionCard:nav_suite not named, the route through the asteroid field stands warned', () => {
  const move = through();
  showTactical(table(move), move);
  expectShownStanding('routeBlocked');
});
