import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './spynet';

const YSSARIL: Opponent = { id: 'o1', faction: 'yssaril', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const CARD = 'actionCard:abs';
/**
 * My turn that plays Spy Net at its start and takes `card`. `choices` on a tactical entry is what pass 2 adds: today
 * only a component action carries choices, so the field is written through a cast.
 */
const turn = (card: string | null = CARD): Entry => ({ ...using(tactical(NEAR), NOTE), ...(card ? { choices: { card } } : {}) } as Entry);
const table = (entry: Entry) => bench({
  faction: 'sol', units: { [NEAR]: { carrier: 1 } }, entries: [entry],
  game: { opponents: [YSSARIL], start: { me: { promissory: [NOTE] }, opponents: { o1: { hand: [CARD] } } } },
});

describe('promissory:spynet Spy Net', () => {
  // "At the start of your turn: Look at the Yssaril player's hand of action cards. Choose 1 of those cards and add it
  //  to your hand."
  // Checks: the card chosen leaves the Yssaril player's hand and joins mine.
  // Why the check is redundant here: an action card otherwise changes hands only in a transaction (94.3) or comes
  // from the deck (2.3); the note moves it without either, so no transaction is made or warned of.
  test('promissory:spynet takes the chosen action card from the Yssaril player\'s hand', () => {
    const entry = turn();
    const t = table(entry);
    quote(t.pack, id, 'Choose 1 of those cards and add it to your hand.');
    const end = endOf(t);
    expect(end.holdings.hand).toContain(CARD);
    expect(end.rivals?.o1.holdings.hand).not.toContain(CARD);
    expectNone(warningsOf(t, entry), 'transactionKind');
  });

  // "Then, return this card to the Yssaril player." (LRR 69.3)
  // Checks: the note goes back to the Yssaril player once played, as every note that says so.
  // Why the check is NOT redundant here: the holding of the note is counted with or without the card taken.
  test('promissory:spynet played goes back to the Yssaril player', () => {
    const t = table(turn(null));
    quote(t.pack, id, 'Then, return this card to the Yssaril player.');
    expect(endOf(t).holdings.promissory).not.toContain(NOTE);
    expect(endOf(t).rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Yssaril player playing their own Spy Net is warned of.
  // Why the check is NOT redundant here: the note is for the other players.
  test('promissory:spynet the Yssaril player cannot play their own', () => {
    const own = `${id}@me`;
    const entry = using(tactical(NEAR), own);
    const t = bench({ faction: 'yssaril', start: { promissory: [own] }, entries: [entry] });
    expectStanding(warningsOf(t, entry), 'ownPromissory');
  });

  test('promissory:spynet is a play effect', () => {
    const { pack } = table(turn());
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
