import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './holy_planet_of_ixth';

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** One infantry built at the dock of Home One, paid with Home One. */
const build = () => tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });

const table = (entry: Entry, elect: string | null) =>
  ({ entry, ...bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 1 } }, game: { docks: ['h1'] }, rounds: [elect ? [resolved(elect)] : [], [entry]] }) });

describe('agenda:holy_planet_of_ixth Holy Planet of Ixth', () => {
  // "Units on this planet cannot use PRODUCTION."
  // Checks: the law is on Home One; its space dock builds one infantry, over a value of 0.
  // Why the check is NOT redundant here: the production check (67, 79) is not lifted but given a new number: a dock on
  // the elected planet produces nothing, so even one unit is over its value (a modify of `productionValue`).
  test.fails('agenda:holy_planet_of_ixth a dock on the elected planet cannot produce: the production is over its value of 0', () => {
    const t = table(build(), 'h1');
    quote(t.pack, id, 'Units on this planet cannot use PRODUCTION.');
    const warnings = warningsOf(t, t.entry);
    expectStanding(warnings, 'productionOver');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 0, count: 1 });
  });

  // Checks: the law is on Home Two; the dock of Home One produces as printed.
  // Why the check is redundant here: only units on the elected planet lose PRODUCTION.
  test('agenda:holy_planet_of_ixth a dock on another planet produces as printed', () => {
    const t = table(build(), 'h2');
    expectNone(warningsOf(t, t.entry), 'productionOver');
  });

  // "The planet's owner gains 1 victory point."
  // Checks: the law is resolved on Home One, which I control: I have 1 victory point more.
  // Why: a victory point the plan counts (`vp`).
  test('agenda:holy_planet_of_ixth gives the owner of the elected planet 1 victory point', () => {
    const t = bench({ faction: 'sol', rounds: [[resolved('h1')]] });
    expect(endOf(t).vp).toBe(1);
  });

  // Checks: resolved on Target One, which nobody controls, it gives me nothing.
  test('agenda:holy_planet_of_ixth gives nothing to a player who does not control the elected planet', () => {
    const t = bench({ faction: 'sol', rounds: [[resolved('t1')]] });
    expect(endOf(t).vp).toBe(0);
  });

  // "When a player gains control of this planet, they gain 1 victory point."
  // Checks: the law is on Target One; in round 2 my infantry lands there and takes it: 1 victory point.
  test.fails('agenda:holy_planet_of_ixth gaining control of the elected planet gives 1 victory point', () => {
    const land = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const t = table(land, 't1');
    expect(endOf(t).vp).toBe(1);
  });

  test.fails('agenda:holy_planet_of_ixth is a passive effect that changes the production of a dock and the points', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(Object.keys(effect(pack, id).modify ?? {}).sort()).toEqual(['productionValue', 'vp']);
  });

  test.todo('agenda:holy_planet_of_ixth losing control of the elected planet loses 1 victory point: falls out of the vp point counting control (a planet a rival takes by a landing of his entry is no longer mine); to be written with the point in pass 2');
});
