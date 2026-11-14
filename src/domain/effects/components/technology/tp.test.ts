import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './tp';

describe('technology:tp Transparasteel Plating', () => {
  // "During your turn of the action phase, players that have passed cannot play action cards."
  // Checks: the technology is a reminder with no waiver.
  // Why nothing is validated here: it forbids other players something during my turn, and the plan does not plan the
  // action cards other players play in my turn; it lifts no check of mine either.
  test('technology:tp is a hint with no waiver', () => {
    const { pack } = bench({ faction: 'yssaril', start: { technologies: [id] } });
    quote(pack, id, 'players that have passed cannot play action cards');
    expect(effect(pack, id).tier).toBe('hint');
  });
});
