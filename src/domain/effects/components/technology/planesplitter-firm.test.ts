import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './planesplitter-firm';

describe('technology:planesplitter-firm Planesplitter (Firmament)', () => {
  // "When you gain this card, put The Fracture into play."
  // Checks: the technology is a reminder of the research and lifts no check.
  // Why nothing is validated: the Fracture is opened on the board of the game, not by an entry of the plan, so gaining
  // the card changes nothing the replay counts.
  test('technology:planesplitter-firm is a reminder of the research and waives nothing', () => {
    const { pack } = bench({ faction: 'firmament', expansions: ['pok', 'te'] });
    quote(pack, id, 'When you gain this card, put The Fracture into play.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('technology:planesplitter-firm gaining it opens the Fracture: the Fracture is opened on the board of the game, not by the replay of a plan');
});
