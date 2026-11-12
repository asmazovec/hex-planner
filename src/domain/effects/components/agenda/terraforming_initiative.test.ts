import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, HOME, quote, secondary, tactical, warningsOf } from '../kit';
import { id } from './terraforming_initiative';

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Two cruisers built at the dock of Home One (4 resources), paid with Home One alone (printed 3). */
const build = () => tactical(HOME, { production: { cruiser: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
/** Leadership's secondary buying one token (3 influence), paid with `planet` alone: Home One gives 1, Home Two 2. */
const buyOne = (planet: string) => secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: [planet], tradeGoods: 0 } });

const table = (entry: Entry, elect: string | null) =>
  ({ entry, ...bench({ faction: 'sol', game: { docks: ['h1'] }, rounds: [elect ? [resolved(elect)] : [], [entry]] }) });

describe('agenda:terraforming_initiative Terraforming Initiative', () => {
  // "The resource and influence values of this planet are increased by 1."
  // Checks: with the law on Home One it gives 4 resources, enough for two cruisers.
  // Why the check is redundant here: the resources check adds up the values of the planets spent; the law changes the
  // value of the elected planet (a modify), so no warning is made.
  test.fails('agenda:terraforming_initiative the elected planet gives 1 resource more', () => {
    const t = table(build(), 'h1');
    quote(t.pack, id, 'The resource and influence values of this planet are increased by 1.');
    expectNone(warningsOf(t, t.entry), 'shortResources');
  });

  // Checks: with the law on Home Two it gives 3 influence, enough to buy one command token.
  // Why the check is redundant here: the same for influence (47.2): the elected planet's value is 1 more.
  test.fails('agenda:terraforming_initiative the elected planet gives 1 influence more', () => {
    const t = table(buyOne('h2'), 'h2');
    expectNone(warningsOf(t, t.entry), 'shortInfluence');
  });

  // Checks: the law is on Home One, Home Two keeps its printed 2 influence and the token is short of it.
  // Why the check is NOT redundant here: only the elected planet's values change.
  test('agenda:terraforming_initiative another planet keeps its printed values', () => {
    const t = table(buyOne('h2'), 'h1');
    expectStanding(warningsOf(t, t.entry), 'shortInfluence');
  });

  // Checks: without the law Home One is short of the two cruisers.
  // Why the check is NOT redundant here: no law is in play.
  test('agenda:terraforming_initiative without the law the printed value is short', () => {
    const t = table(build(), null);
    expectStanding(warningsOf(t, t.entry), 'shortResources');
  });

  test.fails('agenda:terraforming_initiative is a passive effect that changes both values of a planet', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(Object.keys(effect(pack, id).modify ?? {}).sort()).toEqual(['planetInfluence', 'planetResources']);
  });
});
