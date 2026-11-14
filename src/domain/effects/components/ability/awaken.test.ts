import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './awaken';

const titans = () => bench({ faction: 'titans', expansions: ['pok'] });

describe('ability:awaken Awaken', () => {
  // "After you activate a system that contains 1 or more of your sleeper tokens: You may replace each of those tokens
  //  with 1 PDS from your reinforcements."
  // Checks: the ability is a reminder at the activation.
  // Why nothing is validated here: sleeper tokens are not on the board of the plan, so there is no token to replace.
  // A PDS placed this way can be put on the board by hand (an adjustment); the structure limit (2 PDS per planet) is
  // then checked as for any other PDS, which is not redundant with Awaken (Titans of Ul, Hecatoncheires note 3).
  test('ability:awaken is a hint of the activation', () => {
    const { pack } = titans();
    quote(pack, id, 'You may replace each of those tokens with 1 PDS from your reinforcements');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.todo('ability:awaken replaces the sleeper tokens of the activated system with PDS: the plan keeps no sleeper tokens');
  test.todo('ability:awaken a PDS placed on another player\'s planet without ground forces takes it (Awaken note 4): sleeper tokens are not modelled');
});
