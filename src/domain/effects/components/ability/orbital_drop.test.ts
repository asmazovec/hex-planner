import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './orbital_drop';

/**
 * Pass 2 declares this code in `src/domain/rules/codes/placeNotControlled.ts`: units an ability places "on a planet you
 * control" go on one the player does not control.
 */
const PLACE = 'placeNotControlled' as ExtensionCode;

const drop = (planet: string) => componentAction(id, { choices: { planet } } as Partial<Entry>);
const table = (faction: string, entries: Entry[]) => bench({ faction, entries });

describe('ability:orbital_drop Orbital Drop', () => {
  // "ACTION: Spend 1 token from your strategy pool to place 2 infantry from your reinforcements on 1 planet you control."
  // Checks: the component action names the ability and h1; two infantry stand on h1 and the strategy pool has 1 of its 2.
  // Why the check is redundant here: the infantry are not produced (67), so no unit with Production, no limit and no
  // payment is asked; the ability itself says where they go and what it costs.
  test.fails('ability:orbital_drop places two infantry on a planet I control for a strategy token', () => {
    const entry = drop('h1');
    const sol = table('sol', [entry]);
    quote(sol.pack, id, 'Spend 1 token from your strategy pool to place 2 infantry from your reinforcements on 1 planet you control');
    const end = endOf(sol);
    expect(end.ground.h1?.infantry).toBe(2);
    expect(end.strategy).toBe(1);
    expectNone(warningsOf(sol, entry), PLACE);
  });

  // LRR 20.4 with "Spend 1 token from your strategy pool".
  // Checks: with the strategy pool emptied before, the drop is warned of as a pool going below zero.
  // Why the check is NOT redundant here: the ability has a cost, and the pool cannot pay it.
  test.fails('ability:orbital_drop with an empty strategy pool is warned of', () => {
    const entry = drop('h1');
    const sol = table('sol', [adjust({ strategy: -2 }), entry]);
    expectStanding(warningsOf(sol, entry), 'poolNegative');
  });

  // "... on 1 planet you control."
  // Checks: t1 is nobody's of mine: the drop there is warned of.
  // Why the check is NOT redundant here: the ability places on a planet the player controls only.
  test.fails('ability:orbital_drop on a planet I do not control is warned of', () => {
    const entry = drop('t1');
    expectStanding(warningsOf(table('sol', [entry]), entry), PLACE);
  });

  // Checks: the ability is printed on the Sol faction sheet; another faction naming it places nothing.
  // Why the check is NOT redundant here: nothing this player holds places infantry by an action.
  test('ability:orbital_drop is the Federation of Sol\'s own: another faction places no infantry', () => {
    const entry = drop('h1');
    const end = endOf(table('letnev', [entry]));
    expect(end.ground.h1?.infantry ?? 0).toBe(0);
  });

  // Checks: the ability is played by its component action, so its effect is a `play`.
  test.fails('ability:orbital_drop is a play effect', () => {
    expect(effect(table('sol', []).pack, id).tier).toBe('play');
  });
});
