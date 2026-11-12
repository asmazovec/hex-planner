import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './plotsplots';

const firmament = () => bench({ faction: 'firmament', expansions: ['pok', 'te'] });

describe('ability:plotsplots Plots Within Plots', () => {
  // "You can score secret objectives already scored by other players if you fulfill their requirements; this does not
  //  count against your secret objective limit or the number you can score in a round."
  // Checks: the ability is a reminder in the block of the status phase and lifts no check.
  // Why nothing is validated: the plan checks no secret objective limit, no count of objectives scored in a round and
  // not who else scored an objective (the points of a status entry are entered by hand), so the ability has no check
  // to lift; its plot card is not tracked either.
  test('ability:plotsplots is a reminder of the status phase and waives nothing', () => {
    const { pack } = firmament();
    quote(pack, id, 'this does not count against your secret objective limit or the number you can score in a round');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('ability:plotsplots scoring another player\'s secret objective gives a plot card instead of a point: plot cards and the secret objective limit are not modelled');
});
