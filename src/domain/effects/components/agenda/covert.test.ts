import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './covert';

describe('agenda:covert Covert Legislation', () => {
  // "the speaker draws the next card in the agenda deck but does not reveal it to the other players."
  // Checks: the card is a hint with no step of the count and no waiver.
  // Why nothing is validated: the card changes only how an agenda is voted on (an unseen outcome). The plan counts no
  // votes; the agenda that is then resolved is entered as an entry of its own, with its own effect.
  test('agenda:covert is a hint: the plan counts no votes', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'the speaker draws the next card in the agenda deck but does not reveal it to the other players');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt ?? []).toEqual([]);
  });
});
