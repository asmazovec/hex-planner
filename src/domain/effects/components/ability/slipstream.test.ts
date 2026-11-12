import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './slipstream';

/** The row with `near` in NEAR: an alpha wormhole by default; 'r-delta' is a tile with a delta wormhole only. */
const map = (near = 'r-alpha') => ({ [HOME]: 'r-home', [NEAR]: near, [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' });

/** A carrier (move 1) flies from `from` along `via` to `target`. */
const flight = (faction: string, from: string, via: string[], target: string, near?: string) => {
  const move = tactical(target, { moves: [{ from, units: { carrier: 1 }, via }] });
  return {
    move,
    ...bench({
      faction, units: { [from]: { carrier: 1 } }, entries: [move], game: { map: map(near) },
      edit: pack => { pack.tiles['r-delta'] = { id: 'r-delta', number: 'r-delta', planetIds: [], kind: 'system', wormholes: ['delta'] }; },
    }),
  };
};

describe('ability:slipstream Slipstream', () => {
  // "During your tactical actions: Apply +1 to the move value of each of your ships that starts its movement in your
  //  home system or in a system that contains either an alpha or beta wormhole."
  // Checks: a Creuss carrier (move 1) flies two systems out of the home system with no warning.
  // Why the default limit does not apply: 58.3.6 checks the route against the move value; the ability does not lift
  // the check, it raises the value to 2 for this ship (a `modify` of `speed`), so nothing is listed as waived.
  test.fails('ability:slipstream a carrier starting in the home system flies two systems', () => {
    const table = flight('ghost', HOME, [NEAR], TARGET);
    quote(table.pack, id, 'Apply +1 to the move value of each of your ships that starts its movement in your home system');
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // "... or in a system that contains either an alpha or beta wormhole."
  // Checks: the carrier starting in the alpha system NEAR flies two systems with no warning.
  test.fails('ability:slipstream a carrier starting in an alpha wormhole system flies two systems', () => {
    const table = flight('ghost', NEAR, [TARGET], FAR);
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: three systems from the home system are one too many: the warning names the move of 2.
  // Why the check is NOT redundant here: the ability adds 1, it does not lift the move value.
  test.fails('ability:slipstream still warns of a route one system beyond the raised move value', () => {
    const table = flight('ghost', HOME, [NEAR, TARGET], FAR);
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'speedShort');
    expect(warnings.find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 3 });
  });

  // Checks: a carrier starting in TARGET, neither home nor a wormhole system, keeps move 1.
  // Why the check is NOT redundant here: the ship does not start where the ability speaks of.
  test('ability:slipstream a carrier starting elsewhere keeps its move value', () => {
    const table = flight('ghost', TARGET, [FAR], FARTHER);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // Ruling (Creuss, Slipstream 1): "Slipstream does not apply to the Creuss Gate or to the Hil Colish, or to gamma
  //  wormholes."
  // Checks: a delta wormhole system is not one the ability names; a carrier starting there keeps move 1.
  // Why the check is NOT redundant here: only alpha and beta wormholes count.
  test('ability:slipstream a delta wormhole does not count', () => {
    const table = flight('ghost', NEAR, [TARGET], FAR, 'r-delta');
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // LRR 58.3.6.
  // Checks: another faction's carrier out of its home system keeps move 1.
  // Why the check is NOT redundant here: the ability is printed on the Creuss faction sheet alone.
  test('ability:slipstream is the Creuss player\'s own: another faction is warned', () => {
    const table = flight('letnev', HOME, [NEAR], TARGET);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: the ability changes a number of the count: a passive effect that modifies the speed.
  test.fails('ability:slipstream is a passive effect that modifies the speed', () => {
    const { pack } = flight('ghost', HOME, [], NEAR);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.speed).toBeDefined();
  });
});
