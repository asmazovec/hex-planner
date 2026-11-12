import { describe, expect, test } from 'vitest';
import type { Act, Entry, Opponent } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectStanding, expectWaived, FAR, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './convoys';

const HACAN: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const deal = (): Act => ({ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} });
/** A tactical action into the empty system next to home, with a transaction with the Hacan, who sits far away: no neighbours. */
const trade = () => tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [deal()] });
const sol = (rounds: Entry[][], hacanAt = FAR) => bench({
  faction: 'sol', units: { [HOME]: { carrier: 1 } }, start: { promissory: [NOTE] }, rounds,
  game: { opponents: [HACAN], enemyUnits: { [hacanAt]: { o1: { carrier: 1 } } } },
});

describe('promissory:convoys Trade Convoys', () => {
  // "While this card is in your play area, you may negotiate transactions with players who are not your neighbor."
  // Checks: Sol plays the note, then trades with the Hacan, who is no neighbour; the warning is listed and lifted by
  // the note.
  // Why the check is redundant here: 94.1 limits transactions to neighbours, and the card in play lifts that limit.
  test('promissory:convoys played lifts the neighbour check of a later transaction', () => {
    const move = trade();
    const table = sol([[adjust({ tradeGoods: 1 }), componentAction(NOTE), move]]);
    quote(table.pack, id, 'you may negotiate transactions with players who are not your neighbor');
    expectWaived(warningsOf(table, move), 'notNeighbor', NOTE);
  });

  // Ruling (Hacan, Trade Convoys 4): "Trade Convoys has no effect while it is in a player's hand."
  // Checks: held but not played, the note lifts nothing.
  // Why the check is NOT redundant here: the card acts only from the play area.
  test('promissory:convoys held in hand leaves the neighbour check standing', () => {
    const move = trade();
    expectStanding(warningsOf(sol([[adjust({ tradeGoods: 1 }), move]]), move), 'notNeighbor');
  });

  // "While this card is in your play area ..."
  // Checks: played in round 1, it still lifts the check in round 2.
  // Why the check is redundant here: the card stays in the play area from round to round until it is returned.
  test.fails('promissory:convoys played in an earlier round still lifts the neighbour check', () => {
    const move = trade();
    const table = sol([[componentAction(NOTE)], [adjust({ tradeGoods: 1 }), move]]);
    expectWaived(warningsOf(table, move), 'notNeighbor', NOTE);
  });

  // "If you activate a system that contains 1 or more of the Hacan player's units, return this card to the Hacan player."
  // Checks: once played it stays with Sol, and only the activation of a system holding a Hacan ship returns it.
  // Why this is the card's own: a played note returns only when its text says when (69.3); this one names the
  // activation of a system with the Hacan's units, which the replay does not watch for yet (today it stays for good).
  test.fails('promissory:convoys stays in the play area until a system with the Hacan\'s units is activated', () => {
    const played = sol([[componentAction(NOTE)]]);
    expect(endOf(played).holdings.promissory).toContain(NOTE);
    const returned = sol([[componentAction(NOTE), tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] })]], NEAR);
    expect(endOf(returned).holdings.promissory).not.toContain(NOTE);
    expect(endOf(returned).rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // Ruling (Hacan, Trade Convoys 3): "The player with Trade Convoys in play is still limited to one transaction with
  //  every other player per turn."
  // Checks: two transactions with the Hacan in one turn are warned of even with the note in play.
  // Why the check is NOT redundant here: the card lifts the neighbour rule, not the count of transactions.
  test('promissory:convoys does not lift the one transaction per player and turn', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [deal(), deal()] });
    const table = sol([[adjust({ tradeGoods: 2 }), componentAction(NOTE), move]]);
    expectStanding(warningsOf(table, move), 'transactionRepeated');
  });

  test('promissory:convoys is a play effect that waives the neighbour check', () => {
    const { pack } = sol([[]]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['notNeighbor']);
  });
});
