import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './the_tribuni';

describe('ability:the_tribuni The Tribuni', () => {
  // "During setup, choose an unplayed faction from among the Mentak, the Xxcha and The Argent Flight; take that
  //  faction's home system, command tokens and control markers."
  // Checks: the ability is a reminder with no step.
  // Why the check is NOT redundant here: nothing is validated, because the choice is made once, when the game is
  // created: the three Keleres sheets of the pack (keleresm, keleresa, keleresx) already are the three choices, each
  // with its home system and its hero. No entry of the plan makes this choice, so no step has anything to check.
  test('ability:the_tribuni is a hint without a step: the choice belongs to the setup', () => {
    const { pack } = bench({ faction: 'keleresm', expansions: ['pok'] });
    quote(pack, id, 'During setup, choose an unplayed faction from among the Mentak, the Xxcha and The Argent Flight');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(['keleresm', 'keleresa', 'keleresx'].map(faction => pack.factions[faction]?.sheet?.abilities.some(a => a.id === 'the_tribuni'))).toEqual([true, true, true]);
  });
});
