import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, HOME } from '../kit';
import { id } from './muaatagent';

uiBench();

// "ACTION: Exhaust this card to choose a player: that player may produce up to 2 units..."
// Checks: the player row offers the acting player as well as the others, and the choice is kept in the entry.
// Why: the card says «a player», not «another player»; the Muaat usually chooses themselves.
test('leader:muaatagent the choice of a player offers me too', async () => {
  const turn = componentAction(undefined as unknown as string);
  const table = bench({
    faction: 'muaat', expansions: ['pok'], units: { [HOME]: { warsun: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [turn],
    game: { opponents: [{ id: 'o1', faction: 'xxcha', vp: 0, seat: 2, color: 2 }] },
  });
  const live = showTurn(table, turn);
  await play('Umbat');
  await choose(/Muaat/, 'Player');
  expect(live.entry().choices).toEqual({ player: 'me' });
});
