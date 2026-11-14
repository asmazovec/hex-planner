import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './shard_of_the_throne';

/** The agenda resolved in the agenda phase of round 1, with the player elected (`me` or an opponent id). */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

const table = (elect: string) => bench({ faction: 'sol', rounds: [[resolved(elect)]] });

describe('agenda:shard_of_the_throne Shard of the Throne', () => {
  // "The elected player gains this card and 1 victory point."
  // Checks: elected, I have 1 victory point more, and the law is in play.
  // Why: a victory point the plan counts, gained once when the law is resolved.
  test('agenda:shard_of_the_throne gives the elected player 1 victory point', () => {
    const t = table('me');
    quote(t.pack, id, 'The elected player gains this card and 1 victory point.');
    expect(endOf(t).vp).toBe(1);
    expect(endOf(t).laws).toContain(id);
  });

  // Checks: another player elected, my points stay.
  test('agenda:shard_of_the_throne gives nothing to a player not elected', () => {
    expect(endOf(table('o1')).vp).toBe(0);
  });

  // "A player gains this card and 1 victory point when they win a combat against the owner of this card."
  // Why nothing is counted: the plan does not decide who wins a combat (losses are entered by hand), so the passing of
  // the card is a reminder at the combat; the points it moves are entered by hand.
  test.todo('agenda:shard_of_the_throne passes with its point to the winner of a combat against its owner: who wins a combat is not modelled');

  test('agenda:shard_of_the_throne is played by the agenda entry that resolves it', () => {
    expect(effect(table('me').pack, id).tier).toBe('play');
  });
});
