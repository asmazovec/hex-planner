import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './indoctrination';

describe('ability:indoctrination Indoctrination', () => {
  // "At the start of a ground combat: You may spend 2 influence to replace 1 of your opponent's participating infantry
  //  with 1 infantry from your reinforcements."
  // Checks: the ability is a reminder of the invasion step, with no waiver and no change of a number.
  // Why nothing is validated here: it is resolved at the start of a ground combat (Yin notes 1-2: once per combat, on
  // each planet), and the plan simulates no combat: the ground forces left after it are entered by the player, and so
  // are the 2 influence, as a payment of the entry if the player wants them counted.
  test('ability:indoctrination is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'yin' });
    quote(pack, id, 'You may spend 2 influence to replace 1 of your opponent\'s participating infantry');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
