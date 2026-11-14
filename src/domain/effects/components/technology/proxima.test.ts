import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './proxima';

describe('technology:proxima Proxima Targeting VI', () => {
  // "At the start of a round of ground combat, you may resolve BOMBARDMENT 8 (x3) against your opponent's ground
  //  forces; if you do, make an identical roll against your ground forces."
  // Checks: the technology is a reminder of the invasion, where Bombardment and ground combat are resolved (89.4).
  // Why nothing is validated here: both sentences speak of hits of dice rolls; the plan rolls no dice, and the ground
  // forces lost are entered by hand. No check of the replay is touched.
  test('technology:proxima is a hint of the invasion step, with no waiver', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'], start: { technologies: [id] } });
    quote(pack, id, 'you may resolve BOMBARDMENT 8 (x3) against your opponent\'s ground forces');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  // "Cancel 1 hit produced by BOMBARDMENT rolls made against your ground forces for each of your galvanized units
  //  present." Ruling (Last Bastion, Proxima Targeting VI 2): other players with galvanized units cannot cancel these hits.
  // Checks: the technology changes no number of the count.
  // Why nothing is validated here: the hits cancelled are dice, not a limit the plan checks.
  test('technology:proxima modifies nothing', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'] });
    quote(pack, id, 'for each of your galvanized units present');
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
