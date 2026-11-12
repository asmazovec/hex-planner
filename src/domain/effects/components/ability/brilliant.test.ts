import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, Payment } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NO_PAYMENT, quote, secondary, warningsOf } from '../kit';
import { id } from './brilliant';

/** Home One is worth 5 here, so the two home planets pay 6 resources. */
const SIX: Payment = { planets: ['h1', 'h2'], tradeGoods: 0 };
const research = (technologies: string[], payment: Payment = SIX) => secondary(CARD.technology, { researched: technologies, payment });
const table = (faction: string, entries: Entry[]) => bench({
  faction, entries, edit: pack => { pack.planets.h1 = { ...pack.planets.h1, resources: 5 }; },
});

describe('ability:brilliant Brilliant', () => {
  // "When you spend a command token to resolve the secondary ability of the "Technology" strategy card: You may
  //  resolve the primary ability instead."
  // Checks: the Jol-Nar secondary of Technology researches two technologies for 6 resources: no warning of the
  // research limit, none of resources.
  // Why the default limit does not apply: the secondary is resolved as the primary (91.2: one free, a second for 6),
  // so its limit and cost are the primary's; a `modify` of the card's numbers, nothing is listed as waived.
  test.fails('ability:brilliant the secondary of Technology researches two technologies at the primary\'s cost', () => {
    const entry = research(['technology:gd', 'technology:nm']);
    const warnings = warningsOf(table('jolnar', [entry]), entry);
    expectNone(warnings, 'researchOverLimit');
    expectNone(warnings, 'shortResources');
  });

  // Checks: one technology by the secondary costs nothing for the Jol-Nar.
  // Why the default cost does not apply: the first technology of the primary is free.
  test.fails('ability:brilliant one technology by the secondary costs nothing', () => {
    const entry = research(['technology:gd'], NO_PAYMENT);
    expectNone(warningsOf(table('jolnar', [entry]), entry), 'shortResources');
  });

  // LRR 91 (Technology, secondary): one technology for 4 resources.
  // Checks: the same two technologies by another faction's secondary are over the limit of 1 and short of 8.
  // Why the check is NOT redundant here: Brilliant is the Jol-Nar's own.
  test('ability:brilliant another faction\'s secondary researches one technology for four resources', () => {
    const entry = research(['technology:gd', 'technology:nm']);
    const sol = table('sol', [entry]);
    quote(sol.pack, id, 'You may resolve the primary ability instead.');
    const warnings = warningsOf(sol, entry);
    expectStanding(warnings, 'researchOverLimit');
    expect(warnings.find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 8, paid: 6 });
  });

  // Checks: a third technology is over the primary's limit of two, and the warning names that limit.
  // Why the check is NOT redundant here: the primary researches two technologies at most.
  test.fails('ability:brilliant a third technology is warned of against the primary\'s limit of two', () => {
    const entry = research(['technology:gd', 'technology:nm', 'technology:st']);
    const warnings = warningsOf(table('jolnar', [entry]), entry);
    expectStanding(warnings, 'researchOverLimit');
    expect(warnings.find(w => w.code === 'researchOverLimit')?.params).toMatchObject({ limit: 2, count: 3 });
  });

  // "When you spend a command token to resolve the secondary ability ..."
  // Checks: the secondary still takes a token from the strategy pool.
  // Why the token is NOT waived here: the card swaps the ability resolved, not the cost of resolving it.
  test('ability:brilliant the secondary still spends a strategy token', () => {
    const entry = research(['technology:gd']);
    expect(endOf(table('jolnar', [entry])).strategy).toBe(endOf(table('jolnar', [])).strategy - 1);
  });

  test.fails('ability:brilliant is a passive effect that changes numbers and waives nothing', () => {
    const { pack } = table('jolnar', []);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify).toBeDefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
