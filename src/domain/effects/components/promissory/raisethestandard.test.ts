import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './raisethestandard';

const table = () => bench({ faction: 'sol', expansions: ['pok', 'te'] });

describe('promissory:raisethestandard Raise the Standard', () => {
  // "At the end of a combat: Galvanize 1 of your units that participated."
  // Checks: the note is a reminder in the blocks of the battle in space and of the invasion (ground combat).
  // Why nothing is validated here: a galvanize token only adds a die to combat rolls (Galvanize); the plan rolls no
  // dice and keeps no galvanize tokens, so no check of the replay is touched and none is lifted.
  test('promissory:raisethestandard is a hint of the combat and the invasion steps', () => {
    const { pack } = table();
    quote(pack, id, 'At the end of a combat: Galvanize 1 of your units that participated.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });

  // "Then, return this card to the Last Bastion player."
  // Checks: the note lifts no check: it has no waiver and changes no number.
  // Why nothing is validated here: the return is LRR 69.3, applied by the replay to every note whose text says so.
  test('promissory:raisethestandard waives nothing and modifies nothing', () => {
    const { pack } = table();
    quote(pack, id, 'Then, return this card to the Last Bastion player.');
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
