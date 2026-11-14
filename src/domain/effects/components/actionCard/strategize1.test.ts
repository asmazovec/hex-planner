import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, primary, quote, secondary, using, warningsOf, type Bench } from '../kit';
import { id } from './strategize1';

/** My game with Trade as my strategy card of the round, Strategize in hand. */
const table = (entries: Entry[]): Bench => {
  const made = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries });
  made.game.plans[0].rounds[0].strategyCard = CARD.trade;
  return made;
};

describe('actionCard:strategize1 Strategize', () => {
  // "Perform the secondary ability of any readied or unchosen strategy card."
  // Checks: the secondary of my own readied card, played through the card, is listed as my own secondary and lifted.
  // Why the check is redundant here: LRR 83.4 leaves the secondary of a card to the other players, and the card lets me
  // perform the secondary of any readied card, mine among them.
  test('actionCard:strategize1 lets me perform the secondary of my own readied card: ownSecondary is waived', () => {
    const strategize = using(secondary(CARD.trade), id);
    const mine = table([strategize]);
    quote(mine.pack, id, 'Perform the secondary ability of any readied or unchosen strategy card.');
    expectWaived(warningsOf(mine, strategize), 'ownSecondary', id);
  });

  // LRR 83.4: the secondary ability of a strategy card is resolved by the other players.
  // Checks: the same secondary without the card stands warned.
  // Why the check is NOT redundant here: nothing played lets me resolve my own card's secondary.
  test('actionCard:strategize1 held but not played: my own secondary stands warned', () => {
    const own = secondary(CARD.trade);
    expectStanding(warningsOf(table([own]), own), 'ownSecondary');
  });

  // "... of any readied or unchosen strategy card."
  // Checks: once I resolved the primary of my card it is exhausted, so its secondary through the card stays warned.
  // Why the check is NOT redundant here: an exhausted card is neither readied nor unchosen.
  test('actionCard:strategize1 does not cover my card once its primary is resolved', () => {
    const strategize = using(secondary(CARD.trade), id);
    expectStanding(warningsOf(table([primary(CARD.trade), strategize]), strategize), 'ownSecondary');
  });

  // Ruling 2 (tirules2, Strategize): "The active player must still spend a command token to perform the secondary
  //  ability, other than for Leadership."
  // Checks: the secondary through the card spends one strategy token, as any secondary does.
  // Why the check is NOT redundant here: the card lifts who may resolve the ability, not its cost.
  test('actionCard:strategize1 still spends a strategy token', () => {
    const without = endOf(table([])).strategy;
    expect(endOf(table([using(secondary(CARD.trade), id)])).strategy).toBe(without - 1);
  });

  test.todo('actionCard:strategize1 the secondary is my action (a component action), so after my pass it should warn actionAfterPass: a secondary entry is no turn of the round yet');

  test('actionCard:strategize1 waives ownSecondary for its own entry only', () => {
    expect(effect(table([]).pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([['ownSecondary', undefined]]);
  });
});
