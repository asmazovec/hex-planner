import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, expectNone, expectStanding, quote, secondary, warningsOf } from '../kit';
import { id } from './senate_sanctuary';

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Leadership's secondary buying one token (3 influence), paid with `planet` alone: Home One gives 1, Home Two 2. */
const buyOne = (planet: string) => secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: [planet], tradeGoods: 0 } });

const table = (entry: Entry, elect: string | null) =>
  ({ entry, ...bench({ faction: 'sol', rounds: [elect ? [resolved(elect)] : [], [entry]] }) });

describe('agenda:senate_sanctuary Senate Sanctuary', () => {
  // "The influence value of this planet is increased by 2."
  // Checks: with the law on Home One it gives 3 influence and alone buys a command token.
  // Why the check is redundant here: the influence check (47.2) adds up the values of the planets spent; the law
  // changes the value of the elected planet (a modify), so no warning is made.
  test('agenda:senate_sanctuary the elected planet gives 2 influence more: the token is paid', () => {
    const t = table(buyOne('h1'), 'h1');
    quote(t.pack, id, 'The influence value of this planet is increased by 2.');
    expectNone(warningsOf(t, t.entry), 'shortInfluence');
  });

  // LRR 47.1: a planet's influence value is printed on its card.
  // Checks: without the law Home One gives 1 and the token is short.
  // Why the check is NOT redundant here: no law is in play.
  test('agenda:senate_sanctuary without the law the printed value is short', () => {
    const t = table(buyOne('h1'), null);
    expectStanding(warningsOf(t, t.entry), 'shortInfluence');
  });

  // Checks: the law is on Home One; Home Two gives its printed 2 and the token is short.
  // Why the check is NOT redundant here: only the elected planet's value changes.
  test('agenda:senate_sanctuary another planet keeps its printed value', () => {
    const t = table(buyOne('h2'), 'h1');
    expectStanding(warningsOf(t, t.entry), 'shortInfluence');
  });

  test('agenda:senate_sanctuary is a passive effect that changes the influence of a planet', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(Object.keys(effect(pack, id).modify ?? {})).toEqual(['planetInfluence']);
  });
});
