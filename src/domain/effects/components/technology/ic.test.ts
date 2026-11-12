import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ic';

describe('technology:ic Impulse Core', () => {
  // "At the start of a space combat, you may destroy 1 of your cruisers or destroyers in the active system to produce
  //  1 hit against your opponent's ships"
  // Checks: the technology is a reminder of the combat step.
  // Why nothing is validated here: the hit is produced and assigned inside a space combat (Yin notes: before the
  // anti-fighter barrage), and the plan simulates no combat; the ship destroyed is entered as a loss of the action.
  test('technology:ic is a hint of combat', () => {
    const { pack } = bench({ faction: 'yin', start: { technologies: [id] } });
    quote(pack, id, 'you may destroy 1 of your cruisers or destroyers in the active system to produce 1 hit');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
