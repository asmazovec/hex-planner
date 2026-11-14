import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import type { GameState } from '../../../../testing/old/domain/types';
import { bench, endOf, NEAR, quote, tactical } from '../kit';
import { id } from './blackops';

/** A rival with a ship beside mine: we are neighbours (LRR 60), so we may make a transaction. */
const rival = (faction: string): Player => ({ id: 'o1', faction, vp: 0, seat: 2, color: 2 });
/** In my tactical action I get `got` from the rival and give nothing. */
const deal = (got: string[]): Entry => tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: {}, get: { components: got } }] });

const table = (me: string, them: string, entry: Entry, mine: string[] = [], theirs: string[] = []) => bench({
  faction: me, expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1 } }, entries: [entry],
  game: { opponents: [rival(them)], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { promissory: mine }, opponents: { o1: { promissory: theirs } } } },
});
const tokens = (state: GameState): number => state.tactic + state.fleet + state.strategy;

/** The Firmament's note, with the Firmament as its owner. */
const FROM_FIRMAMENT = `${id}@o1`;

describe('promissory:blackops Black Ops', () => {
  // "When you receive this card, if you are not the Firmament: ... Then, gain 2 command tokens, gain 2 trade goods,
  //  and purge this card."
  // Checks: I (Federation of Sol) receive the note from the Firmament in a transaction: I end with 2 trade goods and 2
  // command tokens more than the same transaction without the note.
  // Why the check is redundant here: no check is lifted; the receipt itself is a gain the count must make.
  test('promissory:blackops received by another player gives 2 trade goods and 2 command tokens', () => {
    const got = table('sol', 'firmament', deal([FROM_FIRMAMENT]), [], [FROM_FIRMAMENT]);
    quote(got.pack, id, 'Then, gain 2 command tokens, gain 2 trade goods, and purge this card.');
    const plain = endOf(table('sol', 'firmament', deal([]), [], [FROM_FIRMAMENT]));
    const after = endOf(got);
    expect(after.tradeGoods).toBe(plain.tradeGoods + 2);
    expect(tokens(after)).toBe(tokens(plain) + 2);
  });

  // "... and purge this card."
  // Checks: the note received is purged: neither I nor the Firmament hold it afterwards.
  // Why the check is redundant here: the note leaves the game on receipt, so it is no longer anyone's to play or trade.
  test('promissory:blackops received is purged: nobody holds it afterwards', () => {
    const after = endOf(table('sol', 'firmament', deal([FROM_FIRMAMENT]), [], [FROM_FIRMAMENT]));
    expect(after.holdings.promissory).not.toContain(FROM_FIRMAMENT);
    expect(after.rivals?.o1.holdings.promissory ?? []).not.toContain(FROM_FIRMAMENT);
  });

  // "When you receive this card, if you are not the Firmament".
  // Checks: the Firmament receiving its own note back gains nothing and keeps the note.
  // Why the check is NOT redundant here: the card gives its gains only to a player who is not the Firmament.
  test('promissory:blackops received back by the Firmament gives nothing', () => {
    const mine = `${id}@me`;
    const back = endOf(table('firmament', 'sol', deal([mine]), [], [mine]));
    const plain = endOf(table('firmament', 'sol', deal([]), [], [mine]));
    expect(back.tradeGoods).toBe(plain.tradeGoods);
    expect(tokens(back)).toBe(tokens(plain));
    expect(back.holdings.promissory).toContain(mine);
  });

  // "When you receive this card".
  // Checks: the note marked as held when the plan begins was not received in the plan, so it gives nothing.
  // Why the check is NOT redundant here: the gains come with the receipt, not with holding the card.
  test('promissory:blackops held from the start gives nothing', () => {
    const held = endOf(table('sol', 'firmament', deal([]), [FROM_FIRMAMENT]));
    const plain = endOf(table('sol', 'firmament', deal([])));
    expect(held.tradeGoods).toBe(plain.tradeGoods);
    expect(tokens(held)).toBe(tokens(plain));
  });

  test.todo('promissory:blackops the Firmament places a plot card with the receiver\'s control token: plot cards are not tracked');
});
