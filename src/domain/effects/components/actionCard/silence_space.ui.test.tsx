import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './silence_space';

uiBench();

/** A cruiser flies from home to the target through another player's destroyer, with the card in hand. */
const table = () => {
  const entry = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  return { entry, ...bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { hand: [id] }, entries: [entry], game: { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } } }) };
};

// "your ships in the chosen system can move through systems that contain other players' ships."
// Checks: the route warning stands until the card is chosen in «Used»; then it is still on the screen, in the allowed
// look, naming the card.
// Why the check is redundant here: the card lets these ships through other players' ships (58.3.2 lifted).
test.fails('actionCard:silence_space chosen in «Used», the blocked route reads as allowed by the card', async () => {
  const silent = table();
  quote(silent.pack, id, 'can move through systems that contain other players\' ships');
  const live = showUses(silent, silent.entry);
  expectShownStanding('routeBlocked');
  await use('In The Silence Of Space');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('routeBlocked', 'In The Silence Of Space');
});

// LRR 58.3.2: "A ship cannot move through a system that contains another player's ships."
// Checks: without the card the warning stands on the screen.
// Why the check is NOT redundant here: no card was played.
test('actionCard:silence_space not chosen, the blocked route stands', () => {
  const silent = table();
  showUses(silent, silent.entry);
  expectShownStanding('routeBlocked');
});
