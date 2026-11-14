import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FAR, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './exile2';

const table = (via: string[], to: string, technologies = [id]) => {
  const move = tactical(to, { moves: [{ from: HOME, units: { destroyer: 1 }, via }] });
  return { move, ...bench({ faction: 'crimson', expansions: ['te'], units: { [HOME]: { destroyer: 1 } }, start: { technologies }, entries: [move] }) };
};

describe('technology:exile2 Exile II', () => {
  // "Cost 1, Combat 7, Move 2"
  // Checks: an Exile II flies two systems without a speed warning.
  test('technology:exile2 an exile flies two systems', () => {
    const crimson = table([NEAR], TARGET);
    quote(crimson.pack, id, 'Cost 1, Combat 7, Move 2');
    expectNone(warningsOf(crimson, crimson.move), 'speedShort');
  });

  // Checks: the upgrade does not raise the move: three systems are warned of against 2.
  // Why the check is NOT redundant here: Exile II moves 2, as Exile I does.
  test('technology:exile2 a third system is warned of against the move of 2', () => {
    const crimson = table([NEAR, TARGET], FAR);
    expect(warningsOf(crimson, crimson.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 3 });
  });

  // "At the end of any players' combat in this unit's system or up to 2 systems away, you may place 1 active or
  //  inactive breach in that system."
  // Checks: the file adds nothing to the generated level and lifts no check.
  // Why nothing is validated: the plan simulates no combat and holds no breaches on its board.
  test('technology:exile2 is the generated upgrade and lifts no check', () => {
    const { pack } = table([NEAR], TARGET);
    quote(pack, id, 'you may place 1 active or inactive breach in that system');
    expect(effect(pack, id).tier).toBe('passive');
  });

  test.todo('technology:exile2 a breach placed at the end of a combat: breaches are not on the plan\'s board');
});
