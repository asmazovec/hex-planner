import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './pop';

describe('promissory:pop Promise of Protection', () => {
  // "the Mentak player cannot use their Pillage faction ability against you"
  // Checks: the component is a hint shown in the block of the transaction step, and lifts nothing.
  // Why nothing is validated here: it only stops Pillage, and Pillage is itself a hint: no trade good is taken by the replay, so there is nothing to forbid or to lift.
  test('promissory:pop is a hint at the transaction step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak' });
    quote(pack, id, "the Mentak player cannot use their Pillage faction ability against you");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['transaction']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo("promissory:pop is returned to the Mentak player when its holder activates a system with Mentak units: the return on activation is not replayed (a note goes back only when it is played, 69.3)");
});
