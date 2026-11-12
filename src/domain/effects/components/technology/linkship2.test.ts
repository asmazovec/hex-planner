import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './linkship2';

/** A destroyer flies the whole row from home: four systems. */
const table = (technologies: string[], faction = 'ralnel') => {
  const move = tactical(FARTHER, { moves: [{ from: HOME, units: { destroyer: 1 }, via: [NEAR, TARGET, FAR] }] });
  return { move, ...bench({ faction, expansions: ['te'], units: { [HOME]: { destroyer: 1 } }, start: { technologies }, entries: [move] }) };
};

describe('technology:linkship2 Linkship II', () => {
  // "Cost 1, Combat 8, Move 4"
  // Checks: with the upgrade a Ral Nel destroyer flies four systems and no speed warning is made.
  // Why the default limit does not apply: the upgrade prints a move value of 4 (Linkship I has 3); the generated
  // numbers of the upgrade change the number the route is checked against.
  test('technology:linkship2 a linkship flies four systems', () => {
    const ralnel = table([id]);
    quote(ralnel.pack, id, 'Cost 1, Combat 8, Move 4');
    expectNone(warningsOf(ralnel, ralnel.move), 'speedShort');
  });

  // Checks: Linkship I moves 3, so the same flight is warned of against the move of 3.
  // Why the check is NOT redundant here: the upgrade is not researched.
  test('technology:linkship2 not researched: Linkship I is warned of against its move of 3', () => {
    const ralnel = table([]);
    expect(warningsOf(ralnel, ralnel.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 3, steps: 4 });
  });

  // "This unit can use the SPACE CANNON ability of one of your structures in its space area"
  // Checks: the file adds nothing to the generated level: Space Cannon and Anti-Fighter Barrage are rolls.
  // Why nothing is validated: the plan simulates no combat and no Space Cannon fire.
  test('technology:linkship2 is the generated upgrade and lifts no check', () => {
    const { pack } = table([id]);
    quote(pack, id, 'This unit can use the SPACE CANNON ability of one of your structures in its space area');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
