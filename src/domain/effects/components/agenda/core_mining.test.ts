import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './core_mining';

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Two cruisers built at the dock of Home One (4 resources), paid with `planet` alone: Home One gives 3, Home Two 1. */
const build = (planet: string) => tactical(HOME, { production: { cruiser: 2 }, payment: { planets: [planet], tradeGoods: 0 } });

/** Round 1 resolves the law on `elect` (or none), round 2 builds. */
const table = (entry: Entry, elect: string | null) =>
  ({ entry, ...bench({ faction: 'sol', game: { docks: ['h1'] }, rounds: [elect ? [resolved(elect)] : [], [entry]] }) });

describe('agenda:core_mining Core Mining', () => {
  // "The resource value of this planet is increased by 2."
  // Checks: with Core Mining on Home One, the planet alone pays the 4 resources of two cruisers.
  // Why the check is redundant here: the resources check (65, 67.4) adds up the resource values of the planets spent;
  // the law does not lift it, it changes the value of the elected planet to 5, so no warning is made at all (a modify).
  test('agenda:core_mining the elected planet gives 2 resources more: the payment covers the cost', () => {
    const t = table(build('h1'), 'h1');
    quote(t.pack, id, 'The resource value of this planet is increased by 2.');
    expectNone(warningsOf(t, t.entry), 'shortResources');
  });

  // LRR 65.1: a planet's resource value is printed on its card.
  // Checks: without the law Home One gives its printed 3 and the payment is short.
  // Why the check is NOT redundant here: no law is in play.
  test('agenda:core_mining without the law the printed value is short', () => {
    const t = table(build('h1'), null);
    expectStanding(warningsOf(t, t.entry), 'shortResources');
  });

  // "Attach this card to the elected planet's card."
  // Checks: the law is on Home One; Home Two keeps its printed 1 and the payment is short.
  // Why the check is NOT redundant here: only the elected planet's value changes.
  test('agenda:core_mining another planet keeps its printed value', () => {
    const t = table(build('h2'), 'h1');
    expectStanding(warningsOf(t, t.entry), 'shortResources');
  });

  // "Then, destroy 1 infantry on the planet."
  // Checks: two of my infantry stand on Home One; resolving the law destroys one of them.
  // Why: a one-time change of the board when the law is resolved, which the plan counts.
  test('agenda:core_mining destroys one infantry on the elected planet when it is resolved', () => {
    const t = bench({ faction: 'sol', rounds: [[adjust({ ground: { h1: { infantry: 2 } } }, 'strategy'), resolved('h1')]] });
    expect(endOf(t).ground.h1?.infantry ?? 0).toBe(1);
  });

  // LRR 7.2 / 8.20: an "Elect" outcome of a law stays in play.
  // Checks: the law is in play after it is resolved, attached to the elected planet.
  test('agenda:core_mining stays in play attached to the elected planet', () => {
    const t = bench({ faction: 'sol', rounds: [[resolved('h1')]] });
    expect(endOf(t).laws).toContain(id);
    expect(endOf(t).attachments?.h1).toContain(id);
  });

  test('agenda:core_mining is a passive effect that changes the resources of a planet', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetResources).toBeDefined();
  });
});
