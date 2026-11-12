import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './solcommander';

describe('leader:solcommander Claire Gibson', () => {
  // "At the start of a ground combat on a planet you control: You may place 1 infantry from your reinforcements on that
  //  planet."
  // Checks: the commander is a reminder in the block of the invasion.
  // Why nothing is validated: the ground combat on a planet the Sol player controls is another player's invasion; a
  // component's effect is asked of the owner of the entry only, and the plan does not model the defence of a planet
  // (Sol notes, Claire Gibson 2: no ground combat, no infantry).
  test('leader:solcommander is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'At the start of a ground combat on a planet you control');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('leader:solcommander places 1 infantry on the defended planet: the defence in another player\'s invasion is not replayed for the defender');
});
