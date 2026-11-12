import { describe, expect, test } from 'vitest';
import type { Act, Entry, Game, Opponent } from '../../../types';
import { bench, effect, expectStanding, expectWaived, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './yssarilbt';

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const STALL = 'ability:stall_tactics';
const deal = (withId: string): Act => ({ kind: 'transaction', with: withId, give: {}, get: {} });
/** A turn of the Sol player with its transactions with me, naming what it uses. */
const theirs = (acts: Act[], uses: string[]): Entry => ({ ...tactical(NEAR, { acts }), owner: 'o1', uses } as Entry);
/** Me, the Yssaril, with the breakthrough; the Sol player beside me in the next system unless `apart`. */
const table = (entry: Entry, apart = false) => {
  const game: Partial<Game> = { opponents: [RIVAL], enemyUnits: apart ? {} : { [NEAR]: { o1: { carrier: 1 } } } };
  return bench({ faction: 'yssaril', expansions: ['te'], units: apart ? {} : { [NEAR]: { carrier: 1 } }, start: { breakthrough: 'held' }, entries: [entry], game });
};

describe('breakthrough:yssarilbt Deepgloom Executable', () => {
  // "You can allow other players to use your STALL TACTICS or SCHEMING faction abilities; when you do, you may resolve
  //  a transaction with that player. During the action phase, that transaction does not count against the
  //  once-per-player transaction limit for that turn."
  // Checks: in the Sol player's turn, which uses Stall Tactics by the breakthrough, they make two transactions with me;
  // the second one's warning is listed and lifted by Deepgloom Executable.
  // Why the check is redundant here: 94.1 allows one transaction with each player per turn; the card says the
  // transaction it brings does not count against that limit.
  test('breakthrough:yssarilbt a second transaction with the Yssaril in a turn that used Stall Tactics is waived', () => {
    const entry = theirs([deal('me'), deal('me')], [STALL, id]);
    const t = table(entry);
    quote(t.pack, id, 'that transaction does not count against the once-per-player transaction limit for that turn');
    expectWaived(warningsOf(t, entry), 'transactionRepeated', id);
  });

  // Ruling (Yssaril notes, Deepgloom Executable 1): "The Yssaril player may perform a transaction with another player
  //  without being neighbors with that player."
  // Checks: the Sol player, with no ship near me, makes the transaction the breakthrough brings: the warning that we
  // are not neighbours is lifted by it.
  // Why the check is redundant here: 94.1 asks neighbours; the transaction of the card is not limited by it.
  test('breakthrough:yssarilbt the transaction it brings needs no neighbours: the warning is waived', () => {
    const entry = theirs([deal('me')], [STALL, id]);
    const t = table(entry, true);
    expectWaived(warningsOf(t, entry), 'notNeighbor', id);
  });

  // LRR 94.1: "The active player can resolve one transaction with each of their neighbors."
  // Checks: two transactions with me in a turn that used neither Stall Tactics nor Scheming stay warned of.
  // Why the check is NOT redundant here: "when you do" ties the transaction to the use of the Yssaril abilities.
  test('breakthrough:yssarilbt without Stall Tactics or Scheming the second transaction stands', () => {
    const entry = theirs([deal('me'), deal('me')], [id]);
    expectStanding(warningsOf(table(entry), entry), 'transactionRepeated');
  });

  // Checks: in my own turn, two transactions with the Sol player stay warned of.
  // Why the check is NOT redundant here: the card speaks of other players using the Yssaril abilities, not of mine.
  test('breakthrough:yssarilbt the Yssaril\'s own turn keeps the limit', () => {
    const entry = { ...tactical(NEAR, { acts: [deal('o1'), deal('o1')] }), uses: [STALL] } as Entry;
    expectStanding(warningsOf(table(entry), entry), 'transactionRepeated');
  });

  test('breakthrough:yssarilbt waives the transaction limit and the neighbours for the entry that names it', () => {
    const { pack } = table(theirs([], []));
    expect(effect(pack, id).tier).not.toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code).sort()).toEqual(['notNeighbor', 'transactionRepeated']);
  });
});
