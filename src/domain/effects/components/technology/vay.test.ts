import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './vay';

describe('technology:vay Valefar Assimilator Y', () => {
  // "While that token is on a technology, this card gains that technology's text."
  // Checks: the card is a hint with no step.
  // Why nothing is validated: the plan does not keep where the "Y" token lies, so it cannot know whose text the card
  // copies; the copied technology's own effect is not put in force.
  test('technology:vay is a hint with no step: the assimilator token is not kept', () => {
    const { pack } = bench({ faction: 'nekro' });
    quote(pack, id, "this card gains that technology's text");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  test.todo('technology:vay puts the assimilated technology\'s effect in force for me: the plan has no record of the technology under the token');
});
