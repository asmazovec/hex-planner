import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './winnubt';

/** Carriers (move 1) fly from home to the target, two systems away. */
const fly = (units: UnitCounts = { carrier: 1 }, via = [NEAR]) => tactical(TARGET, { moves: [{ from: HOME, units, via }] });
const table = (move: Entry, { legendary = true, held = true, units = { carrier: 2 } as UnitCounts } = {}) => ({
  move,
  ...bench({
    faction: 'winnu', expansions: ['te'], units: { [HOME]: units }, entries: [move],
    start: held ? { breakthrough: 'held' } : {},
    edit: pack => { if (legendary) pack.planets.t1 = { ...pack.planets.t1, legendary: 'Test Legend' }; },
  }),
});

describe('breakthrough:winnubt Imperator', () => {
  // "After you activate a system that contains a legendary planet, apply +1 to the move value of 1 of your ships during
  //  this tactical action."
  // Checks: the target holds a legendary planet; one carrier flies two systems on its move of 1; the warning that it
  // falls short is listed and lifted by the breakthrough.
  // Why the check is redundant here: the move value (58.1) of that ship is 2 this action, enough for the route.
  test('breakthrough:winnubt one ship flies one system more into a legendary system: speedShort is waived', () => {
    const winnu = table(fly());
    quote(winnu.pack, id, 'apply +1 to the move value of 1 of your ships during this tactical action');
    expectWaived(warningsOf(winnu, winnu.move), 'speedShort', id);
  });

  // LRR 58.1: a ship moves no farther than its move value.
  // Checks: the target holds no legendary planet, the same flight stands.
  // Why the check is NOT redundant here: the +1 is given after activating a system with a legendary planet only.
  test('breakthrough:winnubt into a system without a legendary planet the flight stands short', () => {
    const winnu = table(fly(), { legendary: false });
    expectStanding(warningsOf(winnu, winnu.move), 'speedShort');
  });

  // "... 1 of your ships ..."
  // Checks: two carriers short of the route are one ship more than the +1 covers.
  // Why the check is NOT redundant here: the text gives the +1 to one ship.
  test('breakthrough:winnubt two short ships are one more than it covers and stand', () => {
    const winnu = table(fly({ carrier: 2 }));
    expectStanding(warningsOf(winnu, winnu.move), 'speedShort');
  });

  // "... apply +1 ..."
  // Checks: a route three systems long is two beyond the carrier's move of 1.
  // Why the check is NOT redundant here: the move value grows by one.
  test('breakthrough:winnubt a ship two systems short stands', () => {
    const winnu = table(fly({ carrier: 1 }, [NEAR, FAR]));
    expectStanding(warningsOf(winnu, winnu.move), 'speedShort');
  });

  // Checks: the breakthrough not yet held changes nothing.
  test('breakthrough:winnubt not held, the flight stands short', () => {
    const winnu = table(fly(), { held: false });
    expectStanding(warningsOf(winnu, winnu.move), 'speedShort');
  });

  test.todo('breakthrough:winnubt +1 to combat rolls for each Support for the Throne in the opponent\'s play area: no dice are rolled, and a passive effect has no step to remind at');

  test('breakthrough:winnubt is a passive effect that waives a ship one system short', () => {
    const { pack } = table(fly());
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['speedShort']);
  });
});
