import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, endOf, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './demilitarized_zone';

/**
 * The check does not exist yet: pass 2 declares it as `src/domain/rules/codes/planetClosed.ts` (rules ['7.2', '8.20'],
 * step 'invasion'), made by the landing, the production of ground forces and the placing of structures on a planet a
 * law in play closes. Until then the code is named by its string.
 */
const CODE = 'planetClosed' as AnyWarningCode;

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** A carrier with one infantry comes from the next system to the target and lands the infantry on `planet`. */
const landOn = (planet: string) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: planet, units: { infantry: 1 } }],
});

/** Round 1 resolves the law on `elect` (or none), round 2 plays `entry`. */
const table = (entry: Entry, elect: string | null) => ({
  entry, ...bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 1 } }, game: { docks: ['h1'] }, rounds: [elect ? [resolved(elect)] : [], [entry]] }),
});

describe('agenda:demilitarized_zone Demilitarized Zone', () => {
  // "Player's units cannot land, be produced, or be placed on this planet."
  // Checks: an infantry lands on Target One under the law; the landing is entered and the plan warns of it, standing.
  // Why the check is NOT redundant here: the law forbids what the rules allow (a landing, 89.4); nothing lifts it, so
  // the replay is to make the warning for everyone while the law is in play.
  test('agenda:demilitarized_zone a landing on the elected planet is warned of', () => {
    const t = table(landOn('t1'), 't1');
    quote(t.pack, id, "Player's units cannot land, be produced, or be placed on this planet.");
    expectStanding(warningsOf(t, t.entry), CODE);
    expect(endOf(t).ground.t1).toEqual({ infantry: 1 });
  });

  // Checks: the law is on Target One; a landing on Target Two is not warned of.
  // Why the check is redundant here: the law closes the elected planet only.
  test('agenda:demilitarized_zone a landing on another planet of the system is not warned of', () => {
    const t = table(landOn('t2'), 't1');
    expectNone(warningsOf(t, t.entry), CODE);
  });

  // Checks: without the law the same landing is not warned of.
  test('agenda:demilitarized_zone without the law a landing is not warned of', () => {
    const t = table(landOn('t1'), null);
    expectNone(warningsOf(t, t.entry), CODE);
  });

  // "... cannot ... be produced ... on this planet."
  // Checks: two infantry built at the dock of Home One are put on Home Two, which the law closes.
  // Why the check is NOT redundant here: units produced go on a planet (68.3); the law forbids that planet.
  test('agenda:demilitarized_zone ground forces produced onto the elected planet are warned of', () => {
    const build = tactical(HOME, { production: { infantry: 2 }, productionGround: { h2: { infantry: 2 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const t = table(build, 'h2');
    expectStanding(warningsOf(t, build), CODE);
  });

  // "Then, destroy all units on that planet."
  // Checks: two infantry and a PDS of mine on Home Two are destroyed when the law is resolved on it.
  // Why: a one-time change of the board when the law is resolved, which the plan counts.
  test('agenda:demilitarized_zone destroys every unit on the elected planet when it is resolved', () => {
    const t = bench({ faction: 'sol', game: { pds: { h2: 1 } }, rounds: [[adjust({ ground: { h2: { infantry: 2 } } }, 'strategy'), resolved('h2')]] });
    const end = endOf(t);
    expect(end.ground.h2 ?? {}).toEqual({});
    expect(end.pds.h2 ?? 0).toBe(0);
  });

  test.todo('agenda:demilitarized_zone a structure placed on the elected planet by Construction is warned of: the same check at the placing of structures, written with it in pass 2');
});
