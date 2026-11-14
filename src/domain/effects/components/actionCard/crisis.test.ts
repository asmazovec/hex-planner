import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './crisis';

describe('actionCard:crisis Crisis', () => {
  // "Skip the next player's turn." (window: at the end of any player's turn, if at least 2 players have not passed)
  // Checks: the card is a hint without a step of its own.
  // Why the check is redundant here: nothing is validated: the plan does not order the turns of the players (it plans
  // mine and the expected actions of the others, not who goes next), so a skipped turn changes nothing it counts, and
  // the window speaks of turns, which no block of an editor stands for.
  test('actionCard:crisis is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['te'] });
    quote(pack, id, "Skip the next player's turn.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
