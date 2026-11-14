import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './yinhero';

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
/** The hero's component action; its choices are the infantry committed, by planet id. */
const commit = (choices: Record<string, number>): Entry => componentAction(id, { choices });
const table = (entries: Entry[], game: Partial<Game> = {}) =>
  bench({ faction: 'yin', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries, game });

describe('leader:yinhero Dannel of the Tenth', () => {
  // "ACTION: Commit up to 3 infantry from your reinforcements to any non-home planets and resolve ground combats on
  //  those planets."
  // Checks: two infantry go to Target One and one to Target Two, straight from the reinforcements, and with nobody
  // there to fight the Yin take control of both planets.
  // Why the check is redundant here: infantry otherwise reach a planet only by landing from ships in the active
  // system (89.4, `landingOutsideSystem`); the hero commits them from the reinforcements without any activation
  // (Yin notes, Quantum Dissemination 4.1 and 6), so nothing of the landing is checked for them.
  test('leader:yinhero commits infantry from the reinforcements to non-home planets and takes the empty ones', () => {
    const hero = commit({ t1: 2, t2: 1 });
    const t = table([hero]);
    quote(t.pack, id, 'Commit up to 3 infantry from your reinforcements to any non-home planets');
    const end = endOf(t);
    expect(end.ground.t1?.infantry).toBe(2);
    expect(end.ground.t2?.infantry).toBe(1);
    expect(end.control.t1).toBe('me');
    expect(end.control.t2).toBe('me');
    expectNone(warningsOf(t, hero), 'landingOutsideSystem');
  });

  // "... to any non-home planets ..."
  // Checks: an infantry chosen for a home planet is not committed; the one for Target One is.
  // Why the check is NOT redundant here: the card names non-home planets only.
  test('leader:yinhero commits nothing to a home planet', () => {
    const t = table([commit({ h1: 1, t1: 1 })]);
    const end = endOf(t);
    expect(end.ground.t1?.infantry).toBe(1);
    expect(end.ground.h1?.infantry ?? 0).toBe(0);
  });

  // "... and resolve ground combats on those planets."
  // Checks: on a planet where the Sol player has an infantry the Yin infantry is committed, but control does not
  // change: the outcome of the ground combat is not known to the plan and is entered by the player.
  // Why the check is NOT redundant here: control is established only after a ground combat is won (89.4, 25), and the
  // plan simulates no combat.
  test('leader:yinhero on a defended planet commits the infantry but takes no control', () => {
    const t = table([commit({ t1: 1 })], { opponents: [RIVAL], enemyGround: { t1: { o1: { infantry: 1 } } }, planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' } });
    const end = endOf(t);
    expect(end.ground.t1?.infantry).toBe(1);
    expect(end.control.t1).not.toBe('me');
  });

  test.todo('leader:yinhero more than three infantry chosen: needs a warning of its own, the play forbids nothing');

  // "Then, purge this card." (LRR 51.12)
  // Checks: the hero is purged by its action: a second one is warned of.
  // Why the check is NOT redundant here: a hero is played once in the game.
  test('leader:yinhero is purged by its play', () => {
    const again = commit({ t1: 1 });
    expectStanding(warningsOf(table([commit({ t1: 1 }), again]), again), 'componentNotHeld');
  });

  test('leader:yinhero is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
