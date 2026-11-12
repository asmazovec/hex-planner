import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { choose, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './titanprototype';

uiBench();

const TURN = componentAction(id);

const table = () => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [TURN], game: { planetControl: { h1: 'me', h2: 'me' } },
});
/** The only player offered is myself: the row «Player» has one button. */
const myself = () => userEvent.click(within(screen.getByRole('group', { name: 'Player' })).getAllByRole('button')[0]);

// "choose a player, that player may spend 3 resources to place a structure on a planet they control."
// Checks: in the editor I choose myself, a PDS and Home One; the entry keeps the three and the plan puts the PDS there.
// Why it is counted here: a structure is otherwise placed by Construction or production; the relic places one by its
// own action.
test('relic:titanprototype myself, a PDS and a planet are chosen in the editor and the PDS stands there', async () => {
  const jr = table();
  quote(jr.pack, id, 'that player may spend 3 resources to place a structure on a planet they control');
  const live = showTurn(jr, TURN);
  await myself();
  await choose('PDS');
  await choose('Home One');
  expect(live.entry().choices).toEqual({ player: 'me', structure: 'pds', planetId: 'h1' });
  expect(endOf({ pack: jr.pack, game: live.game() }).pds.h1).toBe(1);
});

// "If they do not, they gain 1 trade good."
// Checks: choosing myself and no structure, the plan counts 1 trade good.
test('relic:titanprototype myself and no structure, the plan counts 1 trade good', async () => {
  const jr = table();
  const live = showTurn(jr, TURN);
  await myself();
  expect(endOf({ pack: jr.pack, game: live.game() }).tradeGoods).toBe(1);
});
