import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './hydrothermal';

describe('technology:hydrothermal Hydrothermal Mining', () => {
  // "At the start of the status phase, gain 1 trade good for each ocean card in play."
  // Checks: the technology is a reminder of the status phase's block.
  // Why the check is NOT redundant here: nothing is validated or added, because the plan does not count ocean cards,
  // so the number of trade goods is unknown to it; the player enters them in the status phase.
  test('technology:hydrothermal is a hint at the status phase: ocean cards are not counted', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'], start: { technologies: [id] } });
    quote(pack, id, 'gain 1 trade good for each ocean card in play');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });
});
