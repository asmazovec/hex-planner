import { describe, expect, test } from 'vitest';
import { factionNotes } from '../../../holdings';
import { bench, effect, quote } from '../kit';
import { id } from './dark_whispers';

describe('ability:dark_whispers Dark Whispers', () => {
  // "During setup, take the additional Empyrean faction promissory note; you have 2 faction promissory notes"
  // Checks: the notes dealt to the Empyrean player at setup are both of their faction's: Blood Pact and Dark Pact.
  // Why nothing is validated here: the deal at setup (`factionNotes`) already gives every note of the faction, so the
  // ability has nothing left to change; it stays a hint.
  test('ability:dark_whispers the Empyrean player begins with both faction notes', () => {
    const { pack } = bench({ faction: 'empyrean', expansions: ['pok'] });
    quote(pack, id, 'you have 2 faction promissory notes');
    expect(factionNotes(pack, 'empyrean', 'me').sort()).toEqual(['promissory:blood_pact@me', 'promissory:dark_pact@me']);
    expect(effect(pack, id).tier).toBe('hint');
  });
});
