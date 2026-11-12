import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './ws';

/**
 * The check pass 2 adds for everyone (tirules2, units, War Sun 1): "A player without the war sun unit upgrade
 * technology cannot produce, place or have a war sun on the board for any reason." Its file will be
 * src/domain/rules/codes/warSunLocked.ts, step production.
 */
const CODE = 'warSunLocked' as AnyWarningCode;

/** A war sun built at the dock on h1 (Production 5), paid with h1, h2 and eight trade goods. */
const build = (faction: string, technologies: string[] = []) => {
  const entry = tactical(HOME, { production: { warsun: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 8 } });
  return { entry, ...bench({ faction, start: { technologies }, entries: [entry], game: { docks: ['h1'] } }) };
};

describe('technology:ws War Sun', () => {
  // "Cost 12, Combat 3(x3), Move 2, Capacity 6": the technology is the war sun itself; without it the unit is locked.
  // Checks: holding War Sun, a war sun is built; the warning that the war sun is not unlocked is listed and lifted by
  // the technology.
  // Why the check is redundant here: the rule forbids the war sun to a player without its technology, and this is it.
  test('technology:ws lets the war sun be produced: the warning is waived', () => {
    const table = build('hacan', [id]);
    quote(table.pack, id, 'Cost 12, Combat 3(x3), Move 2, Capacity 6');
    expectWaived(warningsOf(table, table.entry), CODE, id);
  });

  // tirules2, units, War Sun 1: "A player without the war sun unit upgrade technology cannot produce, place or have a
  //  war sun on the board for any reason."
  // Checks: the same production without the technology is warned of, and the war sun is built all the same.
  // Why the check is NOT redundant here: nothing this player holds unlocks the war sun.
  test('technology:ws not held, producing a war sun is warned of', () => {
    const table = build('hacan');
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // Checks: a war sun with the technology moves two systems.
  // Why the check finds nothing here: the move check runs against the war sun's move 2, which the sheet and the
  // technology print alike.
  test('technology:ws a war sun moves two systems', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { warsun: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'hacan', units: { [HOME]: { warsun: 1 } }, start: { technologies: [id] }, entries: [move] });
    expectNone(warningsOf(table, move), 'speedShort');
  });

  // "Other players' units in this system lose PLANETARY SHIELD."
  test.todo('technology:ws the lost PLANETARY SHIELD of other players belongs to the combat, which the plan does not fight');

  test('technology:ws is a passive effect that waives the locked war sun', () => {
    const { pack } = build('hacan', [id]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([CODE]);
  });
});
