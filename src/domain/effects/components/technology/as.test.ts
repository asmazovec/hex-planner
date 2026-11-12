import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './as';

/** The test row with an asteroid field at its far end: the system before it is adjacent to an anomaly. */
const ANOMALY = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-asteroid' };
const PLAIN = { ...ANOMALY, [FARTHER]: 'r-empty' };

const table = (move: Entry, units: Record<string, UnitCounts>, { map = ANOMALY, technologies = [id] } = {}) =>
  ({ move, ...bench({ faction: 'empyrean', expansions: ['pok'], units, start: { technologies }, entries: [move], game: { map } }) });

/** A carrier (move 1) flies two systems, from the empty system next to home to the one beside the asteroid field. */
const two = () => tactical(FAR, { moves: [{ from: NEAR, units: { carrier: 1 }, via: [TARGET] }] });
/** The same carrier flies three systems from home. */
const three = () => tactical(FAR, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR, TARGET] }] });

describe('technology:as Aetherstream', () => {
  // "After you or one of your neighbors activates a system that is adjacent to an anomaly, you may apply +1 to the move
  //  value of all of that player's ships during this tactical action."
  // Checks: the active system is adjacent to an asteroid field; my carrier of move 1 flies two systems and no speed
  // warning is made.
  // Why the default limit does not apply: the move value of every ship is 1 more during this action; this changes
  // the number the check compares with (a `modify` of `speed`), nothing is listed as waived.
  test('technology:as adds 1 to the move value when the active system is adjacent to an anomaly', () => {
    const stream = table(two(), { [NEAR]: { carrier: 1 } });
    quote(stream.pack, id, 'you may apply +1 to the move value of all of that player\'s ships during this tactical action');
    expectNone(warningsOf(stream, stream.move), 'speedShort');
  });

  // Checks: three systems are still too far for a carrier of move 2, and the warning names the move of 2.
  // Why the check is NOT redundant here: the technology adds 1, it does not remove the limit.
  test('technology:as still warns beyond the raised move value, against 2', () => {
    const stream = table(three(), { [HOME]: { carrier: 1 } });
    const warnings = warningsOf(stream, stream.move);
    expectStanding(warnings, 'speedShort');
    expect(warnings.find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 3 });
  });

  // "... a system that is adjacent to an anomaly ..." (Aetherstream note 2: a system is not adjacent to itself).
  // Checks: with no anomaly next to the active system the carrier keeps its move value of 1.
  // Why the check is NOT redundant here: the technology's condition is not met.
  test('technology:as gives nothing when the active system is adjacent to no anomaly', () => {
    const stream = table(two(), { [NEAR]: { carrier: 1 } }, { map: PLAIN });
    expect(warningsOf(stream, stream.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 1, steps: 2 });
  });

  // LRR 58.2: a ship moves no farther than its move value.
  // Checks: without the technology the same action is warned of.
  test('technology:as not held, the carrier is warned with its printed move value', () => {
    const stream = table(two(), { [NEAR]: { carrier: 1 } }, { technologies: [] });
    expectStanding(warningsOf(stream, stream.move), 'speedShort');
  });

  test.todo('technology:as for a neighbour\'s tactical action: a component of another player is asked of the owner of the entry only');
});
