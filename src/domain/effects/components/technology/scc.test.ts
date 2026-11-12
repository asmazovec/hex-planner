import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './scc';

/** A Jol-Nar carrier (move 1) flies from the home system straight to the target, two systems away, as a jump. */
const jump = (extra: (move: ReturnType<typeof tactical>) => ReturnType<typeof tactical> = move => move) => {
  const move = extra(tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 } }] }));
  return { move, ...bench({ faction: 'jolnar', units: { [HOME]: { carrier: 1 } }, start: { technologies: [id] }, entries: [move] }) };
};

describe('technology:scc Spatial Conduit Cylinder', () => {
  // "that system is adjacent to all other systems that contain 1 or more of your units during this activation."
  // Checks: the carrier goes from the home system to the target, which is not its neighbour, as one step: no warning
  // of speed is made.
  // Why the check is redundant here: the plan takes two marked systems that are not joined as a jump of one step and
  // checks nothing in between (a portal, the Fracture or an ability like this one), so the adjacency the card makes is
  // already what the plan assumes: nothing is left to lift.
  test('technology:scc a flight straight into the active system is one step: no speed warning to lift', () => {
    const table = jump(move => using(move, id));
    quote(table.pack, id, 'that system is adjacent to all other systems that contain 1 or more of your units during this activation');
    expectNone(warningsOf(table, table.move), 'speedShort');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['movement'] });
  });

  // "You may exhaust this card ..."
  // Checks: the card used in an entry is exhausted: a second use in the same round is warned of.
  // Why the check is NOT redundant here: an exhausted card does nothing until it is readied (34, 71.4).
  test('technology:scc is exhausted by its use: a second use in the round is warned of', () => {
    const first = using(tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id);
    const second = using(tactical(HOME, { moves: [{ from: TARGET, units: { carrier: 1 } }] }), id);
    const table = bench({ faction: 'jolnar', units: { [HOME]: { carrier: 1 } }, start: { technologies: [id] }, entries: [first, second] });
    expectStanding(warningsOf(table, second), 'componentExhausted');
  });
});
