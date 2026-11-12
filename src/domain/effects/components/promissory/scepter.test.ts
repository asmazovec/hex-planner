import { describe, expect, test } from 'vitest';
import type { Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, quote } from '../kit';
import { id } from './scepter';

const MAHACT: Opponent = { id: 'mah', faction: 'mahact', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@mah`;

describe('promissory:scepter Scepter of Dominion', () => {
  // "each other player who has a token on the Mahact player's command sheet places a token from their reinforcements
  //  in that system."
  // Checks: the note is a reminder at the start of the round.
  // Why nothing is validated here: the tokens on the Mahact command sheet are not tracked, so the plan does not know
  // who places a token; each player's token placed is entered by hand.
  test('promissory:scepter is a hint at the start of the round', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'each other player who has a token on the Mahact player\'s command sheet places a token from their reinforcements in that system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
  });

  // "Then, return this card to the Mahact player." (LRR 69.3)
  // Checks: played at the start of the strategy phase, the note leaves my holdings for the Mahact player's.
  test('promissory:scepter goes back to the Mahact player once played', () => {
    const play = componentAction(NOTE, { phase: 'strategy' });
    const table = bench({ faction: 'sol', expansions: ['pok'], start: { promissory: [NOTE] }, entries: [play], game: { opponents: [MAHACT] } });
    quote(table.pack, id, 'Then, return this card to the Mahact player.');
    const end = endOf(table);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.mah.holdings.promissory).toContain(NOTE);
  });
});
