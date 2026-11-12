import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, endOf, HOME, NO_PAYMENT, quote, tactical } from '../kit';
import { id } from './hacanbt';

/** The Hacan produce at home from the space dock on Home One; payment is not what these tests are about. */
const table = (production: UnitCounts, held = true) => bench({
  faction: 'hacan', expansions: ['te'], start: held ? { breakthrough: 'held' } : {},
  entries: [tactical(HOME, { production, payment: NO_PAYMENT })], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } },
});

describe('breakthrough:hacanbt Auto-Factories', () => {
  // "When you produce 3 or more non-fighter ships, place 1 command token from your reinforcements into your fleet pool."
  // Checks: three cruisers produced put a fourth token into the fleet pool.
  // Why the check is redundant here: the fleet pool otherwise grows in the status phase or by Leadership (20.1); the
  // breakthrough adds a token at production.
  test.fails('breakthrough:hacanbt three non-fighter ships produced add a token to the fleet pool', () => {
    const hacan = table({ cruiser: 3 });
    quote(hacan.pack, id, 'When you produce 3 or more non-fighter ships, place 1 command token from your reinforcements into your fleet pool.');
    expect(endOf(hacan).fleet).toBe(4);
  });

  // Checks: two cruisers and two fighters are fewer than three non-fighter ships: nothing is added.
  // Why the check is NOT redundant here: fighters are not counted, by the card's own words.
  test('breakthrough:hacanbt fighters do not count toward the three ships', () => {
    expect(endOf(table({ cruiser: 2, fighter: 2 })).fleet).toBe(3);
  });

  // Checks: without the breakthrough the same production adds nothing.
  test('breakthrough:hacanbt not held, production adds no token', () => {
    expect(endOf(table({ cruiser: 3 }, false)).fleet).toBe(3);
  });

  test.fails('breakthrough:hacanbt is a passive effect', () => {
    expect(effect(table({}).pack, id).tier).toBe('passive');
  });
});
