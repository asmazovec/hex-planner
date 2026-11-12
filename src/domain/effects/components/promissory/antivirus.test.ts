import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './antivirus';

describe('promissory:antivirus Antivirus', () => {
  // "While this card is in your play area, the Nekro player cannot use their Technological Singularity faction ability
  //  against you."
  // Checks: the note is a reminder of the combat step.
  // Why nothing is validated: it stops an ability that fires on units destroyed in combat; the plan fights no combat.
  test('promissory:antivirus is a hint of the combat', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'the Nekro player cannot use their Technological Singularity faction ability against you');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  test.todo('promissory:antivirus returns to the Nekro player when its holder activates a system with Nekro units: the plan does not return a note on an activation');
});
