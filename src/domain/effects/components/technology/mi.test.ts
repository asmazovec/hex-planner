import { describe, expect, test } from 'vitest';
import type { Entry, StartHoldings } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './mi';

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const CARD = 'actionCard:abs';
/** The component action of Mageon Implants; its choices: whose hand, and the card taken. */
const look = (): Entry => componentAction(id, { choices: { from: 'o1', card: CARD } });
const table = (entries: Entry[], start: StartHoldings = { technologies: [id] }) => bench({
  faction: 'yssaril', entries,
  game: { opponents: [RIVAL], start: { me: start, opponents: { o1: { hand: [CARD] } } } },
});

describe('technology:mi Mageon Implants', () => {
  // "ACTION: Exhaust this card to look at another player's hand of action cards. Choose 1 of those cards and add it to
  //  your hand."
  // Checks: the card chosen leaves the Sol player's hand and joins the Yssaril's.
  // Why the check is redundant here: an action card otherwise changes hands only in a transaction (94.3), with a
  // neighbour; the technology takes it from any player, so no transaction is made or warned of.
  test('technology:mi takes the chosen action card from another player\'s hand', () => {
    const action = look();
    const t = table([action]);
    quote(t.pack, id, 'Choose 1 of those cards and add it to your hand.');
    const end = endOf(t);
    expect(end.holdings.hand).toContain(CARD);
    expect(end.rivals?.o1.holdings.hand).not.toContain(CARD);
    expectNone(warningsOf(t, action), 'notNeighbor');
  });

  // "ACTION: Exhaust this card ..." (LRR 34.4)
  // Checks: the action exhausts the technology: a second one in the round is warned of.
  // Why the check is NOT redundant here: an exhausted card cannot be used until it is readied (71.4).
  test('technology:mi is exhausted by its action', () => {
    const again = look();
    const t = table([look(), again]);
    quote(t.pack, id, 'ACTION: Exhaust this card');
    expectStanding(warningsOf(t, again), 'componentExhausted');
  });

  // Checks: without the technology researched the action is warned of.
  // Why the check is NOT redundant here: the technology must be owned to be used.
  test('technology:mi not researched is warned of', () => {
    const action = look();
    expectStanding(warningsOf(table([action], {}), action), 'componentNotHeld');
  });

  test('technology:mi is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
