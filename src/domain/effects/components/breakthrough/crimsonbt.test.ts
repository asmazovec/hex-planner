import { describe, expect, test } from 'vitest';
import type { Holdings } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './crimsonbt';

/** A cruiser (move 2) flies three systems: from `from` along the row to `to`. */
const ROW = [HOME, NEAR, TARGET, FAR, FARTHER];
const flight = (from: string, to: string) => {
  const via = ROW.slice(ROW.indexOf(from) + 1, ROW.indexOf(to));
  return tactical(to, { moves: [{ from, units: { cruiser: 1 }, via }] });
};
const table = (from: string, to: string, breakthrough?: Holdings['breakthrough'], faction = 'crimson') => {
  const move = flight(from, to);
  return { move, ...bench({ faction, expansions: ['te'], units: { [from]: { cruiser: 1 } }, start: breakthrough ? { breakthrough } : {}, entries: [move] }) };
};

describe('breakthrough:crimsonbt Resonance Generator', () => {
  // "During your tactical actions, apply +1 to the move value of each of your ships that starts its movement in your
  //  home system"
  // Checks: a cruiser (move 2) leaves the home system and flies three systems; with the breakthrough held no speed
  // warning is made at all.
  // Why the default limit does not apply: the breakthrough changes the number the route is checked against (58.3: a
  // ship moves up to its move value), so it is a `modify` of `speed`, not a waiver: nothing is listed as waived.
  test('breakthrough:crimsonbt gives +1 move to a ship that starts in the home system', () => {
    const crimson = table(HOME, FAR, 'held');
    quote(crimson.pack, id, 'apply +1 to the move value of each of your ships that starts its movement in your home system');
    expectNone(warningsOf(crimson, crimson.move), 'speedShort');
  });

  // Ruling (Resonance Generator note 1): "The passive, movement ability of Resonance Generator is still in effect
  //  when the card is exhausted."
  // Checks: the same flight with the breakthrough exhausted makes no speed warning either.
  // Why the default limit does not apply: an exhausted card keeps its passive abilities (34.4.1).
  test('breakthrough:crimsonbt exhausted still gives the +1', () => {
    const crimson = table(HOME, FAR, 'exhausted');
    expectNone(warningsOf(crimson, crimson.move), 'speedShort');
  });

  // Checks: the +1 is one: four systems from home are still beyond a cruiser, and the warning names the move of 3.
  // Why the check is NOT redundant here: the breakthrough raises the move value by 1, it does not remove it.
  test('breakthrough:crimsonbt still warns of a fourth system, against the move of three', () => {
    const crimson = table(HOME, FARTHER, 'held');
    const warnings = warningsOf(crimson, crimson.move);
    expectStanding(warnings, 'speedShort');
    expect(warnings.find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 3, steps: 4 });
  });

  // "... that starts its movement in your home system or in a system that contains an active breach."
  // Checks: a cruiser starting in an empty system next to home flies three systems and is warned of with its printed 2.
  // Why the check is NOT redundant here: the start is neither the home system nor (breaches are not on the plan's
  // board) a system with an active breach.
  test('breakthrough:crimsonbt a ship that starts outside the home system keeps its printed move', () => {
    const crimson = table(NEAR, FARTHER, 'held');
    quote(crimson.pack, id, 'or in a system that contains an active breach');
    expect(warningsOf(crimson, crimson.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 3 });
  });

  // LRR 58.3 with the printed move of a cruiser, 2.
  // Checks: without the breakthrough the flight from home is warned of.
  // Why the check is NOT redundant here: a breakthrough is in force only once the player holds it.
  test('breakthrough:crimsonbt not held: the flight from home is warned of', () => {
    const crimson = table(HOME, FAR);
    expectStanding(warningsOf(crimson, crimson.move), 'speedShort');
  });

  test.todo('breakthrough:crimsonbt a ship that starts in a system with an active breach gets the +1: breaches are not on the plan\'s board');
  test.todo('breakthrough:crimsonbt ACTION: flip a breach or place an active breach: breaches are not on the plan\'s board');

  test('breakthrough:crimsonbt is a passive effect that changes the move value', () => {
    const { pack } = table(HOME, FAR, 'held');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.speed).toBeTypeOf('function');
  });
});
