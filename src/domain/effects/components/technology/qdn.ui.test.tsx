import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { EntryBody, Opponent } from '../../../types';
import { adjust, bench, endOf, FAR, planned, quote } from '../kit';
import { id } from './qdn';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };

// "... spend 1 token from your strategy pool and give another player 3 of your trade goods."
// Checks: I name the node at the end of the strategy phase, choose the player, and the entry keeps the choice.
// Why no check is lifted: the card moves tokens and trade goods and breaks no rule.
test('technology:qdn the player is chosen in the editor and receives three trade goods', async () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody, 'strategy');
  const table = bench({ faction: 'hacan', start: { technologies: [id] }, entries: [adjust({ tradeGoods: 3 }, 'strategy'), turn], game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });
  quote(table.pack, id, 'give another player 3 of your trade goods');
  const live = showTurn(table, turn);
  await play('Quantum Datahub Node');
  await choose(/Letnev/);
  expect(live.entry().choices).toEqual({ player: 'o1' });
  expect(endOf({ pack: table.pack, game: live.game() }).rivals?.o1.tradeGoods).toBe(3);
});
