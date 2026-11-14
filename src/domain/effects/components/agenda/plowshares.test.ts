import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './plowshares';

/** The agenda resolved in the agenda phase of round 1, with the outcome that received the most votes. */
const resolved = (outcome: 'for' | 'against'): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome } } as Entry);

/** Three of my infantry on Home One and one on Home Two, then the agenda. */
const table = (outcome: 'for' | 'against') =>
  bench({ faction: 'sol', rounds: [[adjust({ ground: { h1: { infantry: 3 }, h2: { infantry: 1 } } }, 'strategy'), resolved(outcome)]] });

describe('agenda:plowshares Swords to Plowshares', () => {
  // "For: Each player destroys half of their infantry on each planet they control, rounded up. Then, each player gains
  //  trade goods equal to the number of their infantry that were destroyed."
  // Checks: Home One loses 2 of its 3 infantry, Home Two its only one; I gain 3 trade goods.
  // Why: a directive changes the board once (7.8); the infantry and the trade goods are what the plan counts.
  test('agenda:plowshares For destroys half the infantry of each planet, rounded up, for as many trade goods', () => {
    const t = table('for');
    quote(t.pack, id, 'Each player destroys half of their infantry on each planet they control, rounded up.');
    const end = endOf(t);
    expect(end.ground.h1?.infantry ?? 0).toBe(1);
    expect(end.ground.h2?.infantry ?? 0).toBe(0);
    expect(end.tradeGoods).toBe(3);
  });

  // "Against: Each player places 1 infantry from their reinforcements on each planet they control."
  // Checks: each of my two home planets gains one infantry; no trade goods.
  test('agenda:plowshares Against places one infantry on each planet I control', () => {
    const t = table('against');
    quote(t.pack, id, 'Each player places 1 infantry from their reinforcements on each planet they control.');
    const end = endOf(t);
    expect(end.ground.h1?.infantry ?? 0).toBe(4);
    expect(end.ground.h2?.infantry ?? 0).toBe(2);
    expect(end.tradeGoods).toBe(0);
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive leaves no law in play.
  test('agenda:plowshares leaves nothing in play', () => {
    expect(endOf(table('for')).laws ?? []).not.toContain(id);
  });

  test('agenda:plowshares is played by the agenda entry that resolves it', () => {
    expect(effect(table('for').pack, id).tier).toBe('play');
  });

  test.todo('agenda:plowshares the outcome for the opponents: "each player" is every rival too, counted on their own states in pass 2');
});
