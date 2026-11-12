import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './voidborn';

/** The test row with a nebula in the second system. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

const table = (faction: string, move: Entry, units: Record<string, UnitCounts>, game: Parameters<typeof bench>[0]['game'] = {}) =>
  ({ move, ...bench({ faction, expansions: ['pok'], units, entries: [move], game: { map: MAP, ...game } }) });

/** A cruiser flies from home through the nebula to the target. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
/** A cruiser (move 2) starts in the nebula and flies `steps` systems on along the row. */
const outOf = (steps: 2 | 3) => tactical(steps === 2 ? FAR : FARTHER, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: steps === 2 ? [TARGET] : [TARGET, FAR] }] });

describe('ability:voidborn Voidborn', () => {
  // "Nebulae do not affect your ships' movement"
  // Checks: an Empyrean cruiser passes through a nebula; the warning that the route is blocked there is listed and
  // lifted by Voidborn.
  // Why the check is redundant here: LRR 59.1.1 says "A ship cannot move through a nebula", and the ability says that
  // nebulae do not affect the Empyrean ships' movement at all.
  test('ability:voidborn lets a ship pass through a nebula: the warning is waived', () => {
    const empyrean = table('empyrean', through(), { [HOME]: { cruiser: 1 } });
    quote(empyrean.pack, id, 'Nebulae do not affect your ships\' movement');
    expectWaived(warningsOf(empyrean, empyrean.move), 'routeBlocked', id);
  });

  // LRR 59.1.1: "A ship cannot move through a nebula."
  // Checks: another faction is warned of the same route.
  // Why the check is NOT redundant here: the ability is printed on the Empyrean sheet.
  test('ability:voidborn is the Empyrean\'s own: another faction passing a nebula is warned', () => {
    const sol = table('sol', through(), { [HOME]: { cruiser: 1 } });
    expectStanding(warningsOf(sol, sol.move), 'routeBlocked');
  });

  // LRR 58.3.2: a ship cannot move through a system that contains another player's ships.
  // Checks: with another player's ships in the nebula the route stays blocked for the Empyrean player too.
  // Why the check is NOT redundant here: Voidborn speaks of nebulae, not of the ships in them.
  test('ability:voidborn does not lift a block by another player\'s ships in the nebula', () => {
    const empyrean = table('empyrean', through(), { [HOME]: { cruiser: 1 } }, {
      opponents: [{ id: 'sol1', faction: 'sol', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { sol1: { destroyer: 1 } } },
    });
    expectStanding(warningsOf(empyrean, empyrean.move), 'routeBlocked');
  });

  // LRR 59.2: "A ship that begins the Movement step of a tactical action in a nebula treats its move value as 1."
  // Checks: an Empyrean cruiser that starts in the nebula still flies its move value of 2: no speed warning.
  // Why the check is redundant here: the nebula does not affect the Empyrean ships' movement, so the move value of 1
  // does not apply; this is the ship's own number, nothing is listed as waived.
  test('ability:voidborn a ship starting in a nebula keeps its move value', () => {
    const empyrean = table('empyrean', outOf(2), { [NEAR]: { cruiser: 1 } });
    expectNone(warningsOf(empyrean, empyrean.move), 'speedShort');
  });

  // Checks: three systems are still beyond a cruiser's move value of 2, and the warning names 2, not 1.
  // Why the check is NOT redundant here: Voidborn removes the nebula's limit, not the ship's own move value.
  test('ability:voidborn a ship starting in a nebula is still warned beyond its own move value', () => {
    const empyrean = table('empyrean', outOf(3), { [NEAR]: { cruiser: 1 } });
    const warnings = warningsOf(empyrean, empyrean.move);
    expectStanding(warnings, 'speedShort');
    expect(warnings.find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 3 });
  });

  // LRR 59.2, as above.
  // Checks: another faction's cruiser starting in the nebula flies 1.
  // Why the check is NOT redundant here: the nebula slows every ship but the Empyrean ones.
  test('ability:voidborn another faction starting in a nebula is slowed to 1', () => {
    const sol = table('sol', outOf(2), { [NEAR]: { cruiser: 1 } });
    expect(warningsOf(sol, sol.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 1, steps: 2 });
  });
});
