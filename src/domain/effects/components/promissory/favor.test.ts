import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, quote } from '../kit';
import { id } from './favor';

const HACAN: Player = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@me`;

describe('promissory:favor Political Favor', () => {
  // "When an agenda is revealed: Remove 1 token from the Xxcha player's strategy pool and return it to their
  //  reinforcements. Then, discard the revealed agenda and reveal 1 agenda from the top of the deck."
  // Checks: I am the Xxcha player, the Hacan player plays my note: my strategy pool loses 1 token (it starts at 2).
  // Why the default count does not apply: the token is another player's than the one whose entry plays the note.
  test('promissory:favor played by a rival takes a token from the Xxcha strategy pool', () => {
    const play = { ...componentAction(NOTE), owner: 'o1' } as Entry;
    const table = bench({
      faction: 'xxcha', expansions: ['pok'], entries: [play],
      game: { opponents: [HACAN], start: { me: {}, opponents: { o1: { promissory: [NOTE] } } } },
    });
    quote(table.pack, id, 'Remove 1 token from the Xxcha player\'s strategy pool');
    expect(endOf(table).strategy).toBe(1);
  });

  // Checks: without the note held by the rival nothing is taken.
  test('promissory:favor not held, the strategy pool stays', () => {
    const play = { ...componentAction(NOTE), owner: 'o1' } as Entry;
    const table = bench({ faction: 'xxcha', expansions: ['pok'], entries: [play], game: { opponents: [HACAN], start: { me: {}, opponents: {} } } });
    expect(endOf(table).strategy).toBe(2);
  });

  test('promissory:favor is a play effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('play');
  });
});
