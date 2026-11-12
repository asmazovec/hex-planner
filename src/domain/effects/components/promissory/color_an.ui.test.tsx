import { expect, test } from 'vitest';
import { expectNotShown, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, TARGET, tactical } from '../kit';
import { id } from './color_an';

uiBench();

const NOTE = `${id}@a`;

// "When you activate a system that contains 1 or more of the <color> player's units, return this card to the
//  <color> player."
// Checks: the tactical editor of an activation of a system with the owner's infantry, with their Alliance in my hand,
// shows no warning: the card goes back by itself and the action is entered as it is.
// Why no check stands: the card asks nothing of the player; its return is made by the replay.
test('promissory:<color>_an activating the owner\'s system shows no warning and no press is needed', () => {
  const move = tactical(TARGET);
  const an = bench({
    faction: 'sol', expansions: ['pok'], entries: [move],
    game: {
      opponents: [{ id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 }],
      start: { me: { promissory: [NOTE] }, opponents: { a: { promissory: [] } } },
      enemyGround: { t1: { a: { infantry: 1 } } },
    },
  });
  quote(an.pack, id, 'return this card to the <color> player');
  const live = showTactical(an, move);
  expect(live.entry().systemId).toBe(TARGET);
  expectNotShown('componentNotHeld');
});
