import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { Opponent } from '../../../types';
import { bench, endOf, NEAR, planned, quote, tactical, TARGET } from '../kit';
import { id } from './salvage';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

// "After you win a space combat: Your opponent gives you all of their commodities."
// LRR 21.6: a commodity given to another player becomes a trade good.
// Checks: the Hacan replenished six commodities; in «Used» of my attack on their cruiser I choose Salvage; the entry
// names it, and after the plan I have six trade goods and the Hacan no commodities.
// Why the check is redundant here: nothing is lifted; the card moves goods outside a transaction.
test('actionCard:salvage chosen in «Used» of the battle takes the opponent\'s commodities as trade goods', async () => {
  const replenish = planned({ type: 'secondary', card: CARD.trade, effects: {} }, 'action', { owner: RIVAL.id });
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }] });
  const salvage = bench({
    faction: 'sol', units: { [NEAR]: { cruiser: 2 } }, start: { hand: [id] }, entries: [replenish, move],
    game: { opponents: [RIVAL], enemyUnits: { [TARGET]: { [RIVAL.id]: { cruiser: 1 } } } },
  });
  quote(salvage.pack, id, 'Your opponent gives you all of their commodities.');
  const live = showUses(salvage, move);
  await use('Salvage');
  expect(live.entry().uses).toEqual([id]);
  const end = endOf({ pack: salvage.pack, game: live.game() });
  expect(end.tradeGoods).toBe(6);
  expect(end.rivals?.[RIVAL.id].commodities).toBe(0);
});
