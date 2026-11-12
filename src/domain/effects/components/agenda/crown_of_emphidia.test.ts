import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './crown_of_emphidia';

/** The agenda resolved in the agenda phase of round 1, with the player elected (`me` or an opponent id). */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

const table = (elect: string) => bench({ faction: 'sol', rounds: [[resolved(elect)]] });

describe('agenda:crown_of_emphidia The Crown of Emphidia', () => {
  // "The elected player gains this card and 1 victory point."
  // Checks: elected, I have 1 victory point more, and the law is in play.
  // Why: a victory point the plan counts, gained once when the law is resolved.
  test('agenda:crown_of_emphidia gives the elected player 1 victory point', () => {
    const t = table('me');
    quote(t.pack, id, 'The elected player gains this card and 1 victory point.');
    expect(endOf(t).vp).toBe(1);
    expect(endOf(t).laws).toContain(id);
  });

  // Checks: another player elected, my points stay.
  test('agenda:crown_of_emphidia gives nothing to a player not elected', () => {
    expect(endOf(table('o1')).vp).toBe(0);
  });

  // "A player gains this card and 1 victory point after they gain control of a planet in the home system of this
  //  card's owner. Then, the previous owner of this card loses 1 victory point."
  test.todo('agenda:crown_of_emphidia passes with its point to a player who takes a planet of its owner\'s home system: the plan does not track who holds a law after it is resolved');

  test('agenda:crown_of_emphidia is played by the agenda entry that resolves it', () => {
    expect(effect(table('me').pack, id).tier).toBe('play');
  });
});
