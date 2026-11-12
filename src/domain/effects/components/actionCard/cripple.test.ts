import { describe, expect, test } from 'vitest';
import type { Game, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './cripple';

const rival: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
/** The rival holds t1 with two PDS on it and t2 with one; I hold my home planets, h1 with one PDS. */
const board: Partial<Game> = {
  opponents: [rival], planetControl: { t1: 'enemy', t2: 'enemy' }, planetOwner: { t1: 'o1', t2: 'o1' }, pds: { t1: 2, t2: 1, h1: 1 },
};
const cripple = (planet: string) => componentAction(id, { choices: { planet } } as never);
const table = (play = cripple('t1'), hand: string[] = [id]) => ({ play, ...bench({ faction: 'sol', start: { hand }, entries: [play], game: board }) });

describe('actionCard:cripple Cripple Defenses', () => {
  // "Choose 1 planet. Destroy each PDS on that planet."
  // Checks: played as a component action on t1, both of the rival's PDS there are destroyed.
  // Why nothing is waived: the card breaks no rule; it changes the board, and the plan counts the PDS of every
  // player (their Space Cannon, the structure limit 85.4).
  test('actionCard:cripple destroys each PDS on the chosen planet', () => {
    const table1 = table();
    quote(table1.pack, id, 'Choose 1 planet. Destroy each PDS on that planet.');
    expect(endOf(table1).rivals?.o1.pds.t1 ?? 0).toBe(0);
  });

  // "Destroy each PDS on that planet."
  // Checks: "each" is whoever's: my own PDS on a chosen planet of mine is destroyed too.
  // Why nothing is waived: the card speaks of each PDS, not of the opponents' only.
  test('actionCard:cripple destroys my own PDS too when my planet is chosen', () => {
    expect(endOf(table(cripple('h1'))).pds.h1 ?? 0).toBe(0);
  });

  // "Choose 1 planet."
  // Checks: the PDS of another planet, of the same rival in the same system, stay.
  // Why nothing is waived: the card destroys on one planet only.
  test('actionCard:cripple leaves the PDS of the other planets', () => {
    const end = endOf(table());
    expect(end.rivals?.o1.pds.t2).toBe(1);
    expect(end.pds.h1).toBe(1);
  });

  // Ruling (Cripple Defenses 1): "The chosen planet may have zero PDS on it."
  // Checks: a planet without PDS may be chosen: nothing is warned of beyond the card itself.
  // Why nothing is warned of: the ruling allows the choice.
  test('actionCard:cripple on a planet without PDS is not warned of', () => {
    const empty = table(cripple('h2'));
    expect(warningsOf(empty, empty.play)).toEqual([]);
  });

  // LRR 22.1 / 2.7: an action card is played from the hand.
  // Checks: played without being held, the card is warned of.
  // Why the check is NOT redundant here: the card is not in hand.
  test('actionCard:cripple played without being in hand is warned of', () => {
    const none = table(cripple('t1'), []);
    expectStanding(warningsOf(none, none.play), 'componentNotHeld');
    expectNone(warningsOf(none, none.play), 'componentExhausted');
  });

  test('actionCard:cripple is a play effect', () => {
    const { pack } = table();
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
