import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './titansbt';

describe('breakthrough:titansbt Slumberstate Computing', () => {
  // "When COALESCENCE results in a ground combat, if you commit no other units, you may choose for your units to
  //  coexist instead. During the status phase, for each player you are coexisting with, you and that player each draw
  //  1 additional action card."
  // Checks: the breakthrough is a reminder of the invasion (coexistence) and of the status phase (the draws).
  // Why nothing is validated here: the plan does not keep coexistence, nor the action cards drawn in the status phase,
  // nor sleeper tokens; there is no check of the replay it lifts.
  test('breakthrough:titansbt is a hint of the invasion and the status phase', () => {
    const { pack } = bench({ faction: 'titans', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may choose for your units to coexist instead');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion', 'status']);
  });

  test.todo('breakthrough:titansbt the units coexist on a planet with another player\'s ground forces: coexistence is not modelled');
  test.todo('breakthrough:titansbt the reminder is shown in the status phase: hints of a breakthrough are not shown yet (known limit of the foundation)');
});
